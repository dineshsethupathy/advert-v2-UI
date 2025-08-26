import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService, StoreAssignmentResponse } from '../../services/assignment.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
    selector: 'app-action-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './action-view.component.html',
    styleUrl: './action-view.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ActionViewComponent implements OnInit {
    assignmentId: number = 0;
    currentStoreIndex: number = 0;
    stores: StoreAssignmentResponse[] = [];
    currentStore: any = null; // Will hold detailed store information
    loading: boolean = false;
    navigationLoading: boolean = true; // Show spinner initially when page loads

    // Image loading states
    bannerImageLoaded = false;
    beforeImageLoaded = false;
    afterImageLoaded = false;

    // Image modal states
    showImageModal = false;
    modalImageUrl: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private assignmentService: AssignmentService,
        private dashboardService: DashboardService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            // Extract assignmentId from the route /assignments/:id/action-view
            this.assignmentId = +params['id'];
            console.log('ActionView: Assignment ID:', this.assignmentId);
            this.loadStores();
        });
    }

    loadStores(): void {
        this.loading = true;
        this.navigationLoading = true; // Show spinner when first loading stores
        // Load stores for the specific assignment
        this.assignmentService.getStoreAssignments(this.assignmentId).subscribe({
            next: (stores) => {
                // Filter only completed stores
                this.stores = stores.filter(store => store.vendorWorkStatus === 'Completed');
                console.log('Completed stores:', this.stores);

                if (this.stores.length > 0) {
                    this.currentStoreIndex = 0;
                    this.loadCurrentStoreDetails();
                } else {
                    this.loading = false;
                    this.navigationLoading = false; // Hide spinner if no stores
                }
            },
            error: (error) => {
                console.error('Error loading stores:', error);
                this.loading = false;
                this.navigationLoading = false; // Hide spinner on error
            }
        });
    }

    loadCurrentStoreDetails(): void {
        if (this.stores.length === 0) return;

        const currentStoreAssignment = this.stores[this.currentStoreIndex];
        console.log('Loading details for store assignment ID:', currentStoreAssignment.id);

        // Reset image loading states for new store
        this.bannerImageLoaded = false;
        this.beforeImageLoaded = false;
        this.afterImageLoaded = false;

        // Load detailed store information using the store-view endpoint
        this.dashboardService.getStoreView(currentStoreAssignment.id).subscribe({
            next: (storeDetails) => {
                this.currentStore = storeDetails;
                this.loading = false; // Clear initial loading state
                console.log('Loaded store details:', storeDetails);

                // Check if there are no images to load, then hide spinner immediately
                const hasAnyImages = !!(storeDetails?.storeAssignment?.bannerImageUrl ||
                    storeDetails?.storeAssignment?.beforeExecutionImageUrl ||
                    storeDetails?.storeAssignment?.afterExecutionImageUrl);

                if (!hasAnyImages) {
                    this.navigationLoading = false;
                }
                // If there are images, spinner will be hidden by image loading handlers
            },
            error: (error) => {
                console.error('Error loading store details:', error);
                this.loading = false; // Clear initial loading state on error
                this.navigationLoading = false; // Hide spinner on error
            }
        });
    }

    nextStore(): void {
        if (this.currentStoreIndex < this.stores.length - 1) {
            this.navigationLoading = true;
            this.currentStoreIndex++;
            this.loadCurrentStoreDetails();
            console.log('Next Store - Store Assignment ID:', this.stores[this.currentStoreIndex]?.id);
        }
    }

    previousStore(): void {
        if (this.currentStoreIndex > 0) {
            this.navigationLoading = true;
            this.currentStoreIndex--;
            this.loadCurrentStoreDetails();
            console.log('Previous Store - Store Assignment ID:', this.stores[this.currentStoreIndex]?.id);
        }
    }

    goBack(): void {
        this.router.navigate(['/assignments', this.assignmentId]);
    }

    getProgressPercentage(): number {
        if (this.stores.length === 0) return 0;
        return ((this.currentStoreIndex + 1) / this.stores.length) * 100;
    }

    // Image modal methods
    openImageModal(url: string | null): void {
        if (!url) return;
        this.modalImageUrl = url;
        this.showImageModal = true;
    }

    closeImageModal(): void {
        this.showImageModal = false;
        this.modalImageUrl = null;
    }

    // Image loading event handlers
    onBannerImageLoad(): void {
        this.bannerImageLoaded = true;
        this.checkAllImagesLoaded();
    }

    onBeforeImageLoad(): void {
        this.beforeImageLoaded = true;
        this.checkAllImagesLoaded();
    }

    onAfterImageLoad(): void {
        this.afterImageLoaded = true;
        this.checkAllImagesLoaded();
    }

    onBannerImageError(): void {
        this.bannerImageLoaded = true; // Mark as loaded even on error to prevent infinite loading
        this.checkAllImagesLoaded();
    }

    onBeforeImageError(): void {
        this.beforeImageLoaded = true; // Mark as loaded even on error to prevent infinite loading
        this.checkAllImagesLoaded();
    }

    onAfterImageError(): void {
        this.afterImageLoaded = true; // Mark as loaded even on error to prevent infinite loading
        this.checkAllImagesLoaded();
    }

    private checkAllImagesLoaded(): void {
        // Check if all available images are loaded
        const hasBanner = !!this.currentStore?.storeAssignment?.bannerImageUrl;
        const hasBefore = !!this.currentStore?.storeAssignment?.beforeExecutionImageUrl;
        const hasAfter = !!this.currentStore?.storeAssignment?.afterExecutionImageUrl;

        const bannerLoaded = !hasBanner || this.bannerImageLoaded;
        const beforeLoaded = !hasBefore || this.beforeImageLoaded;
        const afterLoaded = !hasAfter || this.afterImageLoaded;

        if (bannerLoaded && beforeLoaded && afterLoaded) {
            this.navigationLoading = false; // Hide spinner only when all images are loaded
        }
    }

    // GPS Location methods
    getGpsAddress(gpsString: string): string {
        if (!gpsString) return '';

        try {
            const parts = gpsString.split('|');
            if (parts.length >= 3) {
                return parts[0]; // Return the address part
            }
        } catch (error) {
            console.error('Error parsing GPS address:', error);
        }
        return gpsString; // Return original string if parsing fails
    }

    getGpsCoordinates(gpsString: string): string {
        if (!gpsString) return '';

        try {
            const parts = gpsString.split('|');
            if (parts.length >= 3) {
                const lat = parseFloat(parts[1]);
                const lng = parseFloat(parts[2]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    return `${lat}, ${lng}`;
                }
            }
        } catch (error) {
            console.error('Error parsing GPS coordinates:', error);
        }
        return '';
    }

    formatCoordinates(coords: string): string {
        try {
            const [lat, lng] = coords.split(',').map((v: string) => parseFloat(v.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
                return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            }
        } catch (error) {
            console.error('Error formatting coordinates:', error);
        }
        return coords; // Return original if parsing fails
    }

    openGoogleMaps(gpsString: string): void {
        if (!gpsString) return;

        try {
            const parts = gpsString.split('|');
            if (parts.length >= 3) {
                const lat = parseFloat(parts[1]);
                const lng = parseFloat(parts[2]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // Open Google Maps with the coordinates
                    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    window.open(googleMapsUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('Error opening Google Maps:', error);
        }
    }
}

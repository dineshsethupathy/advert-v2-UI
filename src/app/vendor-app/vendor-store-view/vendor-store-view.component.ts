import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAssignmentService, StoreAssignment } from '../../services/vendor-assignment.service';
import { VendorHeaderComponent } from '../shared/vendor-header/vendor-header.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor-store-view',
    standalone: true,
    imports: [CommonModule, VendorHeaderComponent],
    templateUrl: './vendor-store-view.component.html',
    styleUrl: './vendor-store-view.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorStoreViewComponent implements OnInit {
    storeAssignmentId: number = 0;
    storeAssignment: StoreAssignment | null = null;
    loading = false;

    // Image loading states
    bannerImageLoaded = false;
    beforeImageLoaded = false;
    afterImageLoaded = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private vendorAssignmentService: VendorAssignmentService
    ) { }

    ngOnInit(): void {
        this.storeAssignmentId = Number(this.route.snapshot.paramMap.get('id'));
        if (this.storeAssignmentId) {
            this.loadStoreDetails();
        }
    }

    loadStoreDetails(): void {
        this.loading = true;
        // Reset image loading states
        this.bannerImageLoaded = false;
        this.beforeImageLoaded = false;
        this.afterImageLoaded = false;

        this.vendorAssignmentService.getStoreForm(this.storeAssignmentId).subscribe({
            next: (response) => {
                this.storeAssignment = response.storeForm;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading store details:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load store details. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
                this.loading = false;
            }
        });
    }

    getStatusColor(status: string): string {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'pending';
            case 'started':
                return 'started';
            case 'before execution':
                return 'before-execution';
            case 'after execution':
                return 'after-execution';
            case 'completed':
                return 'completed';
            default:
                return 'pending';
        }
    }

    canMarkAsComplete(): boolean {
        return !!(this.storeAssignment?.vendorWorkStatus === 'After Execution' &&
            this.storeAssignment?.beforeExecutionImageUrl &&
            this.storeAssignment?.afterExecutionImageUrl);
    }

    markAsComplete(): void {
        if (!this.canMarkAsComplete()) {
            Swal.fire({
                icon: 'warning',
                title: 'Cannot Complete',
                text: 'Both before and after execution images must be uploaded to mark as complete.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Mark as Complete?',
            text: 'Are you sure you want to mark this store as complete? This action cannot be undone.',
            // icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, mark as complete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.vendorAssignmentService.markStoreAsComplete(this.storeAssignmentId).subscribe({
                    next: (updatedStore) => {
                        this.storeAssignment = updatedStore;

                        Swal.fire({
                            icon: 'success',
                            title: 'Completed!',
                            text: 'Store has been marked as complete successfully!',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error marking store as complete:', error);

                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to mark store as complete. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    editStore(): void {
        this.router.navigate(['/vendor-store-edit', this.storeAssignmentId]);
    }

    goBack(): void {
        if (this.storeAssignment?.assignmentId) {
            this.router.navigate(['/vendor-assignments', this.storeAssignment.assignmentId]);
        } else {
            // Fallback to vendor dashboard if assignmentId is not available
            this.router.navigate(['/vendor-dashboard']);
        }
    }

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

    // Image loading event handlers
    onBannerImageLoad(): void {
        this.bannerImageLoaded = true;
    }

    onBannerImageError(): void {
        this.bannerImageLoaded = true; // Hide loader even on error
        console.error('Failed to load banner image');
    }

    onBeforeImageLoad(): void {
        this.beforeImageLoaded = true;
    }

    onBeforeImageError(): void {
        this.beforeImageLoaded = true; // Hide loader even on error
        console.error('Failed to load before execution image');
    }

    onAfterImageLoad(): void {
        this.afterImageLoaded = true;
    }

    onAfterImageError(): void {
        this.afterImageLoaded = true; // Hide loader even on error
        console.error('Failed to load after execution image');
    }
} 
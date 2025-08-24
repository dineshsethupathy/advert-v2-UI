import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService, BrandUserStoreViewResponse } from '../../services/assignment.service';
import { BrandUserApprovalService, ApprovalWorkflowStageResponse } from '../../services/brand-user-approval.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-branduser-store-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './branduser-store-view.component.html',
    styleUrl: './branduser-store-view.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BrandUserStoreViewComponent implements OnInit {
    storeViewData: BrandUserStoreViewResponse | null = null;
    loading = false;
    storeAssignmentId: number = 0;

    // Image loading states
    bannerImageLoaded = false;
    beforeImageLoaded = false;
    afterImageLoaded = false;

    // Image modal states
    showImageModal = false;
    modalImageUrl: string | null = null;

    constructor(
        private assignmentService: AssignmentService,
        private brandUserApprovalService: BrandUserApprovalService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Try to get the ID from route params first
        this.storeAssignmentId = Number(this.route.snapshot.paramMap.get('id'));

        // If not found in params, try to extract from URL
        if (!this.storeAssignmentId) {
            const urlSegments = this.router.url.split('/');
            const storeViewIndex = urlSegments.findIndex(segment => segment === 'store-view');
            if (storeViewIndex !== -1 && storeViewIndex + 1 < urlSegments.length) {
                this.storeAssignmentId = Number(urlSegments[storeViewIndex + 1]);
            }
        }

        if (this.storeAssignmentId) {
            this.loadStoreViewData();
        } else {
            console.error('No store assignment ID found in route or URL');
        }
    }

    loadStoreViewData(): void {
        console.log('Loading store view data for ID:', this.storeAssignmentId);
        this.loading = true;
        this.assignmentService.getBrandUserStoreView(this.storeAssignmentId).subscribe({
            next: (data) => {
                console.log('Store view data loaded:', data);
                this.storeViewData = data;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading store view data:', error);
                this.loading = false;
            }
        });
    }

    goBack(): void {
        // Get assignment ID from the store assignment data
        const assignmentId = this.storeViewData?.storeAssignment?.assignmentId;

        if (assignmentId) {
            // Navigate to the specific assignment page (without /dashboard prefix)
            this.router.navigate(['/assignments', assignmentId]);
        } else {
            // Fallback to assignments list if no assignment ID available
            this.router.navigate(['/assignments']);
        }
    }

    getVendorStatusColor(status: string): string {
        switch (status.toLowerCase()) {
            case 'started':
                return 'primary';
            case 'before execution':
                return 'warning';
            case 'after execution':
                return 'info';
            case 'completed':
                return 'success';
            default:
                return 'primary';
        }
    }

    getApprovalStatusColor(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'bde approved':
                return 'info';
            case 'bdm approved':
                return 'primary';
            case 'ho approved':
                return 'success';
            case 'payment approved':
                return 'success';
            case 'archived':
                return 'secondary';
            default:
                return 'primary';
        }
    }

    getWorkflowStatusColor(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'in progress':
                return 'primary';
            case 'completed':
                return 'success';
            case 'skipped':
                return 'secondary';
            default:
                return 'primary';
        }
    }

    getWorkflowStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'pending';
            case 'in progress':
                return 'in-progress';
            case 'completed':
                return 'completed';
            case 'skipped':
                return 'skipped';
            default:
                return 'pending';
        }
    }

    getActiveStageComment(): string | null {
        if (!this.storeViewData?.vendorWorkflow) return null;

        // Find the current active stage (in progress or the next pending stage)
        const activeStage = this.storeViewData.vendorWorkflow.find(stage =>
            stage.status === 'In Progress' ||
            (stage.status === 'Pending' && stage.comment)
        );

        return activeStage?.comment || null;
    }

    formatDate(dateString: string | undefined): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    }

    formatDateTime(dateString: string | undefined): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    }

    formatDateOnly(dateString: string | undefined): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    hasImages(): boolean {
        if (!this.storeViewData?.storeAssignment) return false;
        const store = this.storeViewData.storeAssignment;
        return !!(store.bannerImageUrl || store.beforeExecutionImageUrl || store.afterExecutionImageUrl);
    }

    getVendorWorkflowProgress(): number {
        if (!this.storeViewData?.vendorWorkflow) return 0;
        const completed = this.storeViewData.vendorWorkflow.filter(stage => stage.status === 'Completed').length;
        const total = this.storeViewData.vendorWorkflow.length;
        return total > 0 ? (completed / total) * 100 : 0;
    }

    getApprovalWorkflowProgress(): number {
        if (!this.storeViewData?.approvalWorkflow) return 0;
        const completed = this.storeViewData.approvalWorkflow.filter(stage => stage.status === 'Completed').length;
        const total = this.storeViewData.approvalWorkflow.length;
        return total > 0 ? (completed / total) * 100 : 0;
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

    // =============================================
    // APPROVAL WORKFLOW METHODS
    // =============================================

    canApproveStage(stage: ApprovalWorkflowStageResponse): boolean {
        // User can approve if they have the required role and stage is in progress
        return stage.status === 'In Progress' && stage.assignedToId === this.getCurrentUserId();
    }

    canRejectStage(stage: ApprovalWorkflowStageResponse): boolean {
        // User can reject if they have the required role and stage is in progress
        return stage.status === 'In Progress' && stage.assignedToId === this.getCurrentUserId();
    }

    approveStage(stage: ApprovalWorkflowStageResponse): void {
        Swal.fire({
            title: 'Approve Stage?',
            text: `Are you sure you want to approve "${stage.stageName}"?`,
            icon: 'question',
            input: 'textarea',
            inputLabel: 'Comment (optional)',
            inputPlaceholder: 'Enter your approval comment...',
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                return null; // No validation required
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.brandUserApprovalService.approveStage(
                    this.storeAssignmentId,
                    stage.workflowStageId,
                    result.value
                ).subscribe({
                    next: (response) => {
                        Swal.fire('Success', 'Stage approved successfully!', 'success');
                        this.loadStoreViewData(); // Reload data to show updated workflow
                    },
                    error: (error) => {
                        Swal.fire('Error', error.error?.message || 'Failed to approve stage', 'error');
                    }
                });
            }
        });
    }

    rejectStage(stage: ApprovalWorkflowStageResponse): void {
        Swal.fire({
            title: 'Reject Stage?',
            text: `Are you sure you want to reject "${stage.stageName}"?`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Comment (required)',
            inputPlaceholder: 'Please provide a reason for rejection...',
            showCancelButton: true,
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please provide a reason for rejection';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.brandUserApprovalService.rejectStage(
                    this.storeAssignmentId,
                    stage.workflowStageId,
                    result.value
                ).subscribe({
                    next: (response) => {
                        Swal.fire('Success', 'Stage rejected successfully!', 'success');
                        this.loadStoreViewData(); // Reload data to show updated workflow
                    },
                    error: (error) => {
                        Swal.fire('Error', error.error?.message || 'Failed to reject stage', 'error');
                    }
                });
            }
        });
    }

    private getCurrentUserId(): number {
        // This should get the current user ID from your auth service
        // For now, returning a placeholder - implement based on your auth system
        return 1; // Replace with actual user ID from auth service
    }

    getActiveApprovalStageComment(): string | null {
        if (!this.storeViewData?.approvalWorkflow) return null;
        const activeStage = this.storeViewData.approvalWorkflow.find(stage => stage.status === 'In Progress');
        return activeStage?.comment || null;
    }

    hasApprovalActions(): boolean {
        if (!this.storeViewData?.approvalWorkflow) return false;
        return this.storeViewData.approvalWorkflow.some(stage =>
            this.canApproveStage(stage) || this.canRejectStage(stage)
        );
    }
}

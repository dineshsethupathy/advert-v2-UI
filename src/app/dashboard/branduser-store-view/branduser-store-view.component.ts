import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService, BrandUserStoreViewResponse, StoreAssignmentResponse } from '../../services/assignment.service';
import { BrandUserApprovalService, ApprovalWorkflowStageResponse } from '../../services/brand-user-approval.service';
import { AuthService } from '../../services/auth.service';
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

    // Multi-store navigation properties (from action-view)
    assignmentId: number = 0;
    currentStoreIndex: number = 0;
    stores: StoreAssignmentResponse[] = [];
    navigationLoading: boolean = false;
    isMultiStoreMode: boolean = false;

    // Cache for approval actions - calculated once during data load
    private _hasApprovalActions: boolean = false;

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
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Try to get the ID from route params first
        this.storeAssignmentId = Number(this.route.snapshot.paramMap.get('id'));

        // Check if we're in multi-store mode by looking for assignment context
        this.checkNavigationMode();

        if (this.storeAssignmentId) {
            // Always load the specific store first to check its status
            this.loadStoreViewData();
        } else {
            console.error('No store assignment ID found in route or URL');
        }
    }

    private checkNavigationMode(): void {
        // Check if we have assignment context in the URL or query params
        const assignmentIdParam = this.route.snapshot.queryParamMap.get('assignmentId');
        if (assignmentIdParam) {
            this.assignmentId = +assignmentIdParam;
            // We'll determine if it's actually multi-store mode after loading the store
        } else {
            // Check if we're coming from the completed tab action
            const urlSegments = this.router.url.split('/');
            const actionViewIndex = urlSegments.findIndex(segment => segment === 'action-view');
            if (actionViewIndex !== -1) {
                // We're in action-view mode, get assignment ID from route
                this.assignmentId = +urlSegments[actionViewIndex - 1];
            }
        }
    }

    loadStores(): void {
        this.loading = true;
        this.navigationLoading = true;

        // Load stores for the specific assignment
        this.assignmentService.getStoreAssignments(this.assignmentId).subscribe({
            next: (stores) => {
                // Filter only completed stores (same as action-view)
                this.stores = stores.filter(store => store.vendorWorkStatus === 'Completed');
                console.log('Completed stores for navigation:', this.stores);

                if (this.stores.length > 0) {
                    // Find the current store index
                    this.currentStoreIndex = this.stores.findIndex(store => store.id === this.storeAssignmentId);
                    if (this.currentStoreIndex === -1) {
                        this.currentStoreIndex = 0;
                    }
                    this.loadCurrentStoreDetails();
                } else {
                    this.loading = false;
                    this.navigationLoading = false;
                }
            },
            error: (error) => {
                console.error('Error loading stores:', error);
                this.loading = false;
                this.navigationLoading = false;
            }
        });
    }

    loadCurrentStoreDetails(): void {
        if (this.stores.length === 0) return;

        const currentStoreAssignment = this.stores[this.currentStoreIndex];
        this.storeAssignmentId = currentStoreAssignment.id;
        console.log('Loading details for store assignment ID:', currentStoreAssignment.id);

        // Reset image loading states for new store
        this.bannerImageLoaded = false;
        this.beforeImageLoaded = false;
        this.afterImageLoaded = false;

        // Load detailed store information
        this.assignmentService.getBrandUserStoreView(this.storeAssignmentId).subscribe({
            next: (storeDetails) => {
                this.storeViewData = storeDetails;
                this.loading = false;
                this.navigationLoading = false;

                // Calculate approval actions after store details are loaded
                this.calculateApprovalActions();
            },
            error: (error) => {
                console.error('Error loading store details:', error);
                this.loading = false;
                this.navigationLoading = false;
            }
        });
    }

    // Multi-store navigation methods
    previousStore(): void {
        if (this.currentStoreIndex > 0) {
            this.currentStoreIndex--;
            this.navigationLoading = true;

            // Add 1-second delay to show loading spinner
            setTimeout(() => {
                this.loadCurrentStoreDetails();
            }, 500);
        }
    }

    nextStore(): void {
        if (this.currentStoreIndex < this.stores.length - 1) {
            this.currentStoreIndex++;
            this.navigationLoading = true;

            // Add 1-second delay to show loading spinner
            setTimeout(() => {
                this.loadCurrentStoreDetails();
            }, 1000);
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

                // Check if we should enable multi-store mode
                this.checkAndEnableMultiStoreMode();

                // Calculate approval actions after store details are loaded
                this.calculateApprovalActions();
            },
            error: (error) => {
                console.error('Error loading store view data:', error);
                this.loading = false;
            }
        });
    }

    private checkAndEnableMultiStoreMode(): void {
        // Only enable multi-store mode if:
        // 1. We have an assignmentId (from query params or URL)
        // 2. The current store is completed
        if (this.assignmentId && this.storeViewData?.storeAssignment?.vendorWorkStatus?.toLowerCase() === 'completed') {
            this.isMultiStoreMode = true;
            console.log('Enabling multi-store mode for completed store');
            // Load the list of completed stores for navigation
            this.loadStores();
        } else {
            this.isMultiStoreMode = false;
            console.log('Single store mode - store is not completed or no assignment context');
        }
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
            case 'started':
                return 'primary';
            case 'in progress':
                return 'info';
            case 'approved':
                return 'success';
            case 'rejected':
                return 'danger';
            case 'completed':
                return 'success';
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

    loadApprovalWorkflow(): void {
        if (!this.storeViewData?.storeAssignment?.id) return;

        this.brandUserApprovalService.getApprovalWorkflowProgress(this.storeViewData.storeAssignment.id).subscribe({
            next: (workflow) => {
                // Update the approval workflow in storeViewData
                if (this.storeViewData) {
                    this.storeViewData.approvalWorkflow = workflow;
                }
                console.log('Approval workflow loaded:', workflow);

                // Calculate approval actions once after workflow is loaded
                this.calculateApprovalActions();
            },
            error: (error) => {
                console.error('Error loading approval workflow:', error);
            }
        });
    }

    canApproveStage(stage: ApprovalWorkflowStageResponse): boolean {
        const currentUser = this.authService.getCurrentUserValue();
        if (!currentUser) return false;


        const canApprove = (stage.status === 'In Progress') &&
            stage.assignedToId === currentUser.roleId &&
            !stage.actionedBy;

        // console.log('Can approve calculation:', {
        //     isInProgress: stage.status === 'In Progress',
        //     hasRequiredRole: stage.assignedToId === currentUser.roleId,
        //     notActioned: !stage.actionedBy,
        //     finalResult: canApprove
        // });

        return canApprove;
    }

    canRejectStage(stage: ApprovalWorkflowStageResponse): boolean {
        const currentUser = this.authService.getCurrentUserValue();
        if (!currentUser) return false;

        // // Debug logs for role ID mismatch
        // console.log('Stage requires role ID:', stage.assignedToId);
        // console.log('Current user role ID:', currentUser.roleId);
        // console.log('Stage status:', stage.status);
        // console.log('Stage actionedBy:', stage.actionedBy);

        // SIMPLIFIED LOGIC:
        // Same logic as approve - user can reject the current pending stage
        // 1. Stage must be "In Progress" (current pending stage)
        // 2. User must have the required role (assignedToId === user.roleId)
        // 3. Stage must not be already actioned (actionedBy is null/empty)

        const canReject = stage.status === 'In Progress' &&
            stage.assignedToId === currentUser.roleId &&
            !stage.actionedBy;

        // console.log('Can reject calculation:', {
        //     isInProgress: stage.status === 'In Progress',
        //     hasRequiredRole: stage.assignedToId === currentUser.roleId,
        //     notActioned: !stage.actionedBy,
        //     finalResult: canReject
        // });

        return canReject;
    }

    approveStage(stage: ApprovalWorkflowStageResponse, comment?: string): void {
        this.brandUserApprovalService.approveStage(
            this.storeAssignmentId,
            stage.workflowStageId,
            comment
        ).subscribe({
            next: (response) => {
                Swal.fire({
                    title: 'Success',
                    text: 'Stage approved successfully!',
                    icon: 'success',
                    timer: 3500,
                    timerProgressBar: true,
                    showConfirmButton: true
                });
                this._hasApprovalActions = false; // Clear cache before reloading
                this.loadStoreViewData(); // Reload data to show updated workflow
            },
            error: (error) => {
                Swal.fire('Error', error.error?.message || 'Failed to approve stage', 'error');
            }
        });
    }

    rejectStage(stage: ApprovalWorkflowStageResponse, comment?: string): void {


        this.brandUserApprovalService.rejectStage(
            this.storeAssignmentId,
            stage.workflowStageId,
            comment
        ).subscribe({
            next: (response) => {
                Swal.fire({
                    title: 'Success',
                    text: 'Stage rejected successfully!',
                    icon: 'success',
                    timer: 3500,
                    timerProgressBar: true,
                    showConfirmButton: true
                });
                this._hasApprovalActions = false; // Clear cache before reloading
                this.loadStoreViewData(); // Reload data to show updated workflow
            },
            error: (error) => {
                console.error('Error rejecting stage:', error);
                Swal.fire('Error', error.error?.message || 'Failed to reject stage', 'error');
            }
        });
    }

    getActiveApprovalStageComment(): string | null {
        if (!this.storeViewData?.approvalWorkflow) return null;
        const activeStage = this.storeViewData.approvalWorkflow.find(stage => stage.status === 'In Progress');
        return activeStage?.comment || null;
    }

    hasApprovalActions(): boolean {
        // Return cached value - calculated once during data load
        return this._hasApprovalActions;
    }

    private calculateApprovalActions(): void {
        if (!this.storeViewData?.approvalWorkflow) {
            this._hasApprovalActions = false;
            return;
        }

        // Debug: Log the approval workflow data to see if actionedByName is present
        //console.log('Approval workflow data for actionedByName check:', this.storeViewData.approvalWorkflow);

        this._hasApprovalActions = this.storeViewData.approvalWorkflow.some(stage =>
            this.canApproveStage(stage) || this.canRejectStage(stage)
        );

        console.log('Approval actions calculated once:', this._hasApprovalActions);
    }

    openApprovalModal(): void {
        // Get available stages for the current user (only current pending stage)
        const availableStages = this.storeViewData?.approvalWorkflow?.filter(stage =>
            this.canApproveStage(stage) || this.canRejectStage(stage)
        ) || [];

        if (availableStages.length === 0) {
            Swal.fire('No Actions Available', 'You don\'t have any stages available for approval or rejection.', 'info');
            return;
        }

        // Get the current pending stage (should be only one)
        const selectedStage = availableStages[0];

        Swal.fire({
            title: 'Take Approval Action',
            input: 'textarea',
            inputLabel: 'Comment (required)',
            inputPlaceholder: 'Enter your comment...',
            inputAttributes: {
                'aria-label': 'Comment input'
            },
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Comment is required!';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel',
            showDenyButton: true,
            denyButtonText: 'Reject',
            confirmButtonColor: '#28a745',
            denyButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            width: '500px'
        }).then((result) => {
            // Comment is now required, so it will always have a value
            const comment = result.value.trim();

            if (result.isConfirmed) {
                // Approve action
                this.approveStage(selectedStage, comment);
            } else if (result.isDenied) {
                // Reject action
                this.rejectStage(selectedStage, comment);
            }
        });
    }

    getCurrentUserId(): number {
        // Get current user from auth service (same as action-view)
        const currentUser = this.authService.getCurrentUserValue();
        return currentUser?.roleId || 0;
    }
}

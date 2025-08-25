import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService, AssignmentResponse, StoreAssignmentResponse, WorkflowProgressResponse } from '../../../services/assignment.service';

@Component({
    selector: 'app-view-assignment',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './view-assignment.component.html',
    styleUrl: './view-assignment.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ViewAssignmentComponent implements OnInit {
    assignment: AssignmentResponse | null = null;
    storeAssignments: StoreAssignmentResponse[] = [];
    workflowProgress: WorkflowProgressResponse | null = null;
    loading = false;
    activeTab: 'all' | 'completed' | 'inProgress' = 'all';

    constructor(
        private assignmentService: AssignmentService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const assignmentId = this.route.snapshot.params['id'];
        if (assignmentId) {
            this.loadAssignment(assignmentId);
            this.loadStoreAssignments(assignmentId);
            // this.loadWorkflowProgress(assignmentId);
        }
    }

    loadAssignment(id: number): void {
        this.loading = true;
        this.assignmentService.getAssignment(id).subscribe({
            next: (assignment) => {
                this.assignment = assignment;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading assignment:', error);
                this.loading = false;
            }
        });
    }

    loadStoreAssignments(assignmentId: number): void {
        this.assignmentService.getStoreAssignments(assignmentId).subscribe({
            next: (storeAssignments) => {
                this.storeAssignments = storeAssignments;
            },
            error: (error) => {
                console.error('Error loading store assignments:', error);
            }
        });
    }

    loadWorkflowProgress(assignmentId: number): void {
        this.assignmentService.getWorkflowProgress(assignmentId).subscribe({
            next: (workflowProgress) => {
                this.workflowProgress = workflowProgress;
            },
            error: (error) => {
                console.error('Error loading workflow progress:', error);
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/assignments']);
    }

    editAssignment(): void {
        if (this.assignment) {
            this.router.navigate(['/assignments', this.assignment.id, 'edit']);
        }
    }

    updateStoreStatus(store: StoreAssignmentResponse): void {
        // TODO: Implement status update modal
        console.log('Update status for store:', store);
    }

    viewStoreDetails(store: StoreAssignmentResponse): void {
        // Navigate to brand user store view
        if (this.assignment) {
            this.router.navigate(['/dashboard/store-view', store.id]);
        }
    }

    viewStoreWorkflow(store: StoreAssignmentResponse): void {
        if (this.assignment) {
            this.router.navigate(['/assignments', this.assignment.id, 'stores', store.id, 'workflow']);
        }
    }

    getProgressPercentage(assignment: AssignmentResponse): number {
        if (assignment.totalStores === 0) return 0;
        return (assignment.completedStores / assignment.totalStores) * 100;
    }

    getProgressColor(assignment: AssignmentResponse): string {
        const percentage = this.getProgressPercentage(assignment);
        if (percentage >= 80) return 'success';
        if (percentage >= 50) return 'warning';
        return 'danger';
    }

    getStatusColor(status: string): string {
        switch (status.toLowerCase()) {
            case 'active':
            case 'in progress':
                return 'primary';
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            default:
                return 'primary';
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

    getStageProgressColor(percentage: number): string {
        if (percentage >= 80) return 'success';
        if (percentage >= 50) return 'warning';
        return 'danger';
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    setActiveTab(tab: 'all' | 'completed' | 'inProgress'): void {
        this.activeTab = tab;
    }

    getCompletedStores(): StoreAssignmentResponse[] {
        return this.storeAssignments.filter(store =>
            store.vendorWorkStatus.toLowerCase() === 'completed'
        );
    }

    getInProgressStores(): StoreAssignmentResponse[] {
        return this.storeAssignments.filter(store =>
            store.vendorWorkStatus.toLowerCase() !== 'completed'
        );
    }

    getCompletedStoresCount(): number {
        return this.getCompletedStores().length;
    }

    getInProgressStoresCount(): number {
        return this.getInProgressStores().length;
    }

    takeActionOnCompleted(): void {
        // TODO: Implement action for completed stores
        console.log('Taking action on completed stores:', this.getCompletedStores());
        // This could open a modal, navigate to a workflow, or trigger a batch process
    }
} 
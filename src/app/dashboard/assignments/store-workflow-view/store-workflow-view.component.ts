import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService, StoreAssignmentResponse, WorkflowProgressResponse } from '../../../services/assignment.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-store-workflow-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './store-workflow-view.component.html',
    styleUrl: './store-workflow-view.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class StoreWorkflowViewComponent implements OnInit {
    storeAssignment: StoreAssignmentResponse | null = null;
    workflowProgress: WorkflowProgressResponse | null = null;
    loading = false;
    assignmentId: number = 0;
    storeAssignmentId: number = 0;

    constructor(
        private assignmentService: AssignmentService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Try both paramMap and params to ensure we get the values
        this.assignmentId = Number(this.route.snapshot.paramMap.get('assignmentId')) ||
            Number(this.route.snapshot.params['assignmentId']);
        this.storeAssignmentId = Number(this.route.snapshot.paramMap.get('storeAssignmentId')) ||
            Number(this.route.snapshot.params['storeAssignmentId']);

        console.log('Route params:', {
            assignmentId: this.assignmentId,
            storeAssignmentId: this.storeAssignmentId,
            paramMap: this.route.snapshot.paramMap,
            params: this.route.snapshot.params
        });

        if (this.assignmentId && this.storeAssignmentId) {
            console.log('Loading store workflow details...');
            this.loadStoreWorkflowDetails();
        } else {
            console.error('Missing required parameters:', { assignmentId: this.assignmentId, storeAssignmentId: this.storeAssignmentId });
        }
    }

    loadStoreWorkflowDetails(): void {
        this.loading = true;
        console.log('Loading workflow progress for assignment:', this.assignmentId);

        // Load workflow progress for the assignment
        this.assignmentService.getWorkflowProgress(this.assignmentId).subscribe({
            next: (workflowProgress) => {
                console.log('Workflow progress loaded:', workflowProgress);
                this.workflowProgress = workflowProgress;

                // Find the specific store assignment
                this.storeAssignment = workflowProgress.storeAssignments.find(
                    sa => sa.id === this.storeAssignmentId
                ) || null;

                console.log('Found store assignment:', this.storeAssignment);
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading store workflow details:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load store workflow details. Please try again.', 'error');
            }
        });
    }

    getStageStatus(stageName: string): string {
        if (!this.storeAssignment) return 'pending';

        switch (stageName.toLowerCase()) {
            case 'started':
                return this.storeAssignment.startedDate ? 'completed' : 'pending';
            case 'before execution':
                return this.storeAssignment.beforeExecutionDate ? 'completed' : 'pending';
            case 'after execution':
                return this.storeAssignment.afterExecutionDate ? 'completed' : 'pending';
            case 'completed':
                return this.storeAssignment.completedDate ? 'completed' : 'pending';
            default:
                return 'pending';
        }
    }

    getStageDate(stageName: string): Date | null {
        if (!this.storeAssignment) return null;

        switch (stageName.toLowerCase()) {
            case 'started':
                return this.storeAssignment.startedDate ? new Date(this.storeAssignment.startedDate) : null;
            case 'before execution':
                return this.storeAssignment.beforeExecutionDate ? new Date(this.storeAssignment.beforeExecutionDate) : null;
            case 'after execution':
                return this.storeAssignment.afterExecutionDate ? new Date(this.storeAssignment.afterExecutionDate) : null;
            case 'completed':
                return this.storeAssignment.completedDate ? new Date(this.storeAssignment.completedDate) : null;
            default:
                return null;
        }
    }

    getStatusColor(status: string): string {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'started':
                return 'info';
            case 'before execution':
                return 'primary';
            case 'after execution':
                return 'secondary';
            case 'completed':
                return 'success';
            default:
                return 'warning';
        }
    }

    getProgressColor(percentage: number): string {
        if (percentage >= 80) return 'success';
        if (percentage >= 50) return 'warning';
        return 'danger';
    }

    formatDate(date: Date | null): string {
        if (!date) return 'Not started';
        return new Date(date).toLocaleString();
    }

    formatDuration(startDate: Date | null, endDate: Date | null): string {
        if (!startDate || !endDate) return 'N/A';

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        }
        return `${diffMinutes}m`;
    }

    goBack(): void {
        this.router.navigate(['/assignments', this.assignmentId]);
    }

    getCurrentStage(): string {
        if (!this.storeAssignment) return 'Pending';

        if (this.storeAssignment.completedDate) return 'Completed';
        if (this.storeAssignment.afterExecutionDate) return 'After Execution';
        if (this.storeAssignment.beforeExecutionDate) return 'Before Execution';
        if (this.storeAssignment.startedDate) return 'Started';
        return 'Pending';
    }

    getOverallProgress(): number {
        if (!this.storeAssignment) return 0;

        let completedStages = 0;
        const totalStages = 4; // Pending, Started, Before Execution, After Execution, Completed

        if (this.storeAssignment.startedDate) completedStages++;
        if (this.storeAssignment.beforeExecutionDate) completedStages++;
        if (this.storeAssignment.afterExecutionDate) completedStages++;
        if (this.storeAssignment.completedDate) completedStages++;

        return Math.round((completedStages / totalStages) * 100);
    }

    // Helper methods for date conversions
    getCreatedDate(): Date | null {
        return this.storeAssignment ? new Date(this.storeAssignment.createdAt) : null;
    }

    getStartedDate(): Date | null {
        return this.storeAssignment?.startedDate ? new Date(this.storeAssignment.startedDate) : null;
    }

    getBeforeExecutionDate(): Date | null {
        return this.storeAssignment?.beforeExecutionDate ? new Date(this.storeAssignment.beforeExecutionDate) : null;
    }

    getAfterExecutionDate(): Date | null {
        return this.storeAssignment?.afterExecutionDate ? new Date(this.storeAssignment.afterExecutionDate) : null;
    }

    getCompletedDate(): Date | null {
        return this.storeAssignment?.completedDate ? new Date(this.storeAssignment.completedDate) : null;
    }

    getUpdatedDate(): Date | null {
        return this.storeAssignment?.updatedAt ? new Date(this.storeAssignment.updatedAt) : null;
    }

    // Helper methods for duration calculations
    getPendingDuration(): string {
        return this.formatDuration(this.getCreatedDate(), this.getStartedDate());
    }

    getStartedDuration(): string {
        return this.formatDuration(this.getStartedDate(), this.getBeforeExecutionDate());
    }

    getBeforeExecutionDuration(): string {
        return this.formatDuration(this.getBeforeExecutionDate(), this.getAfterExecutionDate());
    }

    getAfterExecutionDuration(): string {
        return this.formatDuration(this.getAfterExecutionDate(), this.getCompletedDate());
    }

    getTotalDuration(): string {
        return this.formatDuration(this.getCreatedDate(), this.getCompletedDate());
    }
} 
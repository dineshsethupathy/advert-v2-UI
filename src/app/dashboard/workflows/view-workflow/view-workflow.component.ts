import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService, WorkflowResponse, WorkflowStageResponse } from '../../../services/workflow.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-view-workflow',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './view-workflow.component.html',
    styleUrl: './view-workflow.component.css'
})
export class ViewWorkflowComponent implements OnInit {
    workflow: WorkflowResponse | null = null;
    stages: WorkflowStageResponse[] = [];
    loading = false;
    error: string | null = null;

    constructor(
        private workflowService: WorkflowService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const workflowId = this.route.snapshot.params['id'];
        console.log('ViewWorkflowComponent: Loading workflow with ID:', workflowId);

        if (workflowId) {
            this.loadWorkflow(workflowId);
            this.loadStages(workflowId);
        } else {
            console.error('ViewWorkflowComponent: No workflow ID provided');
            this.error = 'No workflow ID provided';
        }
    }

    loadWorkflow(id: number): void {
        console.log('ViewWorkflowComponent: Loading workflow details for ID:', id);
        this.loading = true;
        this.error = null;

        this.workflowService.getWorkflow(id).subscribe({
            next: (workflow) => {
                console.log('ViewWorkflowComponent: Workflow loaded successfully:', workflow);
                this.workflow = workflow;
                this.loading = false;
            },
            error: (error) => {
                console.error('ViewWorkflowComponent: Error loading workflow:', error);
                this.error = 'Failed to load workflow details';
                this.loading = false;
            }
        });
    }

    loadStages(workflowId: number): void {
        console.log('ViewWorkflowComponent: Loading stages for workflow ID:', workflowId);

        this.workflowService.getStages(workflowId).subscribe({
            next: (stages) => {
                console.log('ViewWorkflowComponent: Stages loaded successfully:', stages);
                this.stages = stages;
            },
            error: (error) => {
                console.error('ViewWorkflowComponent: Error loading stages:', error);
                this.error = 'Failed to load workflow stages';
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/workflows']);
    }

    editWorkflow(): void {
        if (this.workflow) {
            this.router.navigate(['/workflows', this.workflow.id, 'edit']);
        }
    }

    deleteWorkflow(): void {
        if (!this.workflow) return;

        Swal.fire({
            title: 'Delete Workflow',
            text: `Are you sure you want to delete "${this.workflow.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.workflowService.deleteWorkflow(this.workflow!.id).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Workflow has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        }).then(() => {
                            this.router.navigate(['/workflows']);
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting workflow:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete workflow. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    getStageStatus(stage: WorkflowStageResponse): string {
        if (stage.isFinalStage) return 'Final Stage';
        return `Stage ${stage.stageOrder}`;
    }

    getStageStatusColor(stage: WorkflowStageResponse): string {
        if (stage.isFinalStage) return '#f5576c';
        return '#667eea';
    }

    getFinalStagesCount(): number {
        return this.stages ? this.stages.filter(s => s.isFinalStage).length : 0;
    }

    isDeleteDisabled(): boolean {
        return !this.workflow || (this.workflow.assignmentCount > 0);
    }
} 
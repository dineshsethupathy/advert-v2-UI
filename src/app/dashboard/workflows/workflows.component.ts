import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkflowService, WorkflowResponse } from '../../services/workflow.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-workflows',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './workflows.component.html',
    styleUrl: './workflows.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkflowsComponent implements OnInit {
    workflows: WorkflowResponse[] = [];
    loading = false;

    constructor(
        private workflowService: WorkflowService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadWorkflows();
    }

    loadWorkflows(): void {
        this.loading = true;
        this.workflowService.getWorkflows().subscribe({
            next: (workflows) => {
                this.workflows = workflows;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading workflows:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load workflows. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    createNewWorkflow(): void {
        this.router.navigate(['/workflows/create']);
    }

    goBack(): void {
        this.router.navigate(['/assignments']);
    }

    viewWorkflow(id: number): void {
        this.router.navigate(['/workflows', id]);
    }

    editWorkflow(id: number): void {
        this.router.navigate(['/workflows', id, 'edit']);
    }

    deleteWorkflow(workflow: WorkflowResponse): void {
        Swal.fire({
            title: 'Delete Workflow',
            text: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.workflowService.deleteWorkflow(workflow.id).subscribe({
                    next: () => {
                        this.workflows = this.workflows.filter(w => w.id !== workflow.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Workflow has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
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

    getStageCount(workflow: WorkflowResponse): number {
        return workflow.stageCount || 0;
    }

    getFormattedStages(workflow: WorkflowResponse): string {
        return `${workflow.stageCount} stages`;
    }

    getActiveWorkflows(): number {
        return this.filteredWorkflows.filter(w => w.assignmentCount > 0).length;
    }

    getAverageStages(): number {
        if (this.filteredWorkflows.length === 0) return 0;
        const totalStages = this.filteredWorkflows.reduce((sum, w) => sum + w.stageCount, 0);
        return Math.round(totalStages / this.filteredWorkflows.length);
    }

    getTotalAssignments(): number {
        return this.filteredWorkflows.reduce((sum, w) => sum + w.assignmentCount, 0);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    // Get filtered workflows excluding system-configured workflows that users cannot edit/delete
    get filteredWorkflows(): WorkflowResponse[] {
        return this.workflows.filter(workflow => workflow.name !== 'Vendor Workflow');
    }
} 
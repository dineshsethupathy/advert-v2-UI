import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssignmentService, AssignmentResponse } from '../../services/assignment.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-assignments',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './assignments.component.html',
    styleUrl: './assignments.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AssignmentsComponent implements OnInit {
    assignments: AssignmentResponse[] = [];
    loading = false;

    constructor(
        private assignmentService: AssignmentService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadAssignments();
    }

    loadAssignments(): void {
        this.loading = true;
        this.assignmentService.getAssignments().subscribe({
            next: (assignments) => {
                this.assignments = assignments;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading assignments:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load assignments. Please try again.', 'error');
            }
        });
    }

    createNewAssignment(): void {
        this.router.navigate(['/assignments/create']);
    }

    manageWorkflows(): void {
        this.router.navigate(['/workflows']);
    }

    viewAssignment(id: number): void {
        this.router.navigate(['/assignments', id]);
    }

    editAssignment(id: number): void {
        this.router.navigate(['/assignments', id, 'edit']);
    }

    deleteAssignment(id: number): void {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this assignment deletion!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f5576c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.assignmentService.deleteAssignment(id).subscribe({
                    next: () => {
                        Swal.fire(
                            'Deleted!',
                            'Assignment has been deleted successfully.',
                            'success'
                        );
                        this.loadAssignments();
                    },
                    error: (error) => {
                        console.error('Error deleting assignment:', error);
                        Swal.fire(
                            'Error!',
                            'Failed to delete assignment. Please try again.',
                            'error'
                        );
                    }
                });
            }
        });
    }

    getActiveAssignments(): number {
        return this.assignments.filter(a => a.status !== 'Completed').length;
    }

    getTotalStores(): number {
        return this.assignments.reduce((sum, a) => sum + a.totalStores, 0);
    }

    getCompletedStores(): number {
        return this.assignments.reduce((sum, a) => sum + a.completedStores, 0);
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

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }
} 
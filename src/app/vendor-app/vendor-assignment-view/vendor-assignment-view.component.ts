import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAssignmentService, StoreAssignment } from '../../services/vendor-assignment.service';
import { VendorHeaderComponent } from '../shared/vendor-header/vendor-header.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor-assignment-view',
    standalone: true,
    imports: [CommonModule, VendorHeaderComponent],
    templateUrl: './vendor-assignment-view.component.html',
    styleUrl: './vendor-assignment-view.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorAssignmentViewComponent implements OnInit {
    assignmentId: number = 0;
    assignment: any = null;
    storeAssignments: StoreAssignment[] = [];
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private vendorAssignmentService: VendorAssignmentService
    ) { }

    ngOnInit(): void {
        this.assignmentId = Number(this.route.snapshot.paramMap.get('id'));
        if (this.assignmentId) {
            this.loadAssignment();
            this.loadStoreAssignments();
        }
    }

    loadAssignment(): void {
        this.loading = true;
        this.vendorAssignmentService.getAssignment(this.assignmentId).subscribe({
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

    loadStoreAssignments(): void {
        this.vendorAssignmentService.getStoreAssignments(this.assignmentId).subscribe({
            next: (storeAssignments) => {
                this.storeAssignments = storeAssignments;
            },
            error: (error) => {
                console.error('Error loading store assignments:', error);
            }
        });
    }

    updateStoreStatus(store: StoreAssignment, status: string): void {
        Swal.fire({
            title: 'Update Status',
            text: `Are you sure you want to mark this store as "${status}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, update status',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.vendorAssignmentService.updateStoreStatus(store.id, { status }).subscribe({
                    next: (updatedStore) => {
                        // Update the store in the list
                        const index = this.storeAssignments.findIndex(s => s.id === store.id);
                        if (index !== -1) {
                            this.storeAssignments[index] = updatedStore;
                        }

                        Swal.fire({
                            icon: 'success',
                            title: 'Status Updated',
                            text: `Store status has been updated to "${status}" successfully!`,
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error updating store status:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to update store status. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
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

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    getStepStatus(step: any): string {
        if (step.completionPercentage === 100) {
            return 'completed';
        } else if (step.completionPercentage > 0) {
            return 'in-progress';
        } else {
            return 'pending';
        }
    }

    getStepStatusText(step: any): string {
        if (step.completionPercentage === 100) {
            return 'Completed';
        } else if (step.completionPercentage > 0) {
            return 'In Progress';
        } else {
            return 'Pending';
        }
    }

    openStoreForm(store: StoreAssignment): void {
        // Check if the store is completed and navigate accordingly
        if (store.vendorWorkStatus === 'Completed') {
            // Navigate to the store view page for completed stores
            this.router.navigate(['/vendor-store-view', store.id]);
        } else {
            // Navigate to the store edit form for non-completed stores
            this.router.navigate(['/vendor-store-edit', store.id]);
        }
        //this.router.navigate(['/vendor-store-edit', store.id]);
    }

    goBack(): void {
        this.router.navigate(['/vendor-dashboard']);
    }
} 
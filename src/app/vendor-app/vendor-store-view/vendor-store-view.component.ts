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
        this.vendorAssignmentService.getStoreForm(this.storeAssignmentId).subscribe({
            next: (store) => {
                this.storeAssignment = store;
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
            icon: 'question',
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
} 
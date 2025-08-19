import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAssignmentService, StoreAssignment } from '../../services/vendor-assignment.service';
import { VendorHeaderComponent } from '../shared/vendor-header/vendor-header.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor-store-edit',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, VendorHeaderComponent],
    templateUrl: './vendor-store-edit.component.html',
    styleUrl: './vendor-store-edit.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorStoreEditComponent implements OnInit {
    storeAssignmentId: number = 0;
    storeAssignment: StoreAssignment | null = null;
    loading = false;
    formLoading = false;
    storeForm: FormGroup;

    // Image preview URLs
    bannerImagePreview: string | null = null;
    beforeExecutionImagePreview: string | null = null;
    afterExecutionImagePreview: string | null = null;

    // File objects for upload
    bannerImageFile: File | null = null;
    beforeExecutionImageFile: File | null = null;
    afterExecutionImageFile: File | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private vendorAssignmentService: VendorAssignmentService,
        private fb: FormBuilder
    ) {
        this.storeForm = this.fb.group({
            boardWidth: [null, [Validators.required, Validators.min(1), Validators.max(1000)]],
            boardHeight: [null, [Validators.required, Validators.min(1), Validators.max(1000)]],
            notes: ['']
        });
    }

    ngOnInit(): void {
        this.storeAssignmentId = Number(this.route.snapshot.paramMap.get('id'));
        if (this.storeAssignmentId) {
            this.loadStoreForm();
        }
    }

    loadStoreForm(): void {
        this.loading = true;
        this.vendorAssignmentService.getStoreForm(this.storeAssignmentId).subscribe({
            next: (store) => {
                this.storeAssignment = store;
                this.initializeForm();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading store form:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load store form. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
                this.loading = false;
            }
        });
    }

    initializeForm(): void {
        if (this.storeAssignment) {
            this.storeForm.patchValue({
                boardWidth: this.storeAssignment.boardWidth || null,
                boardHeight: this.storeAssignment.boardHeight || null,
                notes: this.storeAssignment.vendorNotes || ''
            });

            // Set image previews
            this.bannerImagePreview = this.storeAssignment.bannerImageUrl || null;
            this.beforeExecutionImagePreview = this.storeAssignment.beforeExecutionImageUrl || null;
            this.afterExecutionImagePreview = this.storeAssignment.afterExecutionImageUrl || null;
        }
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

    onBannerImageSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.bannerImageFile = file;
            this.previewImage(file, 'banner');
        }
    }

    onBeforeExecutionImageSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.beforeExecutionImageFile = file;
            this.previewImage(file, 'before');
        }
    }

    onAfterExecutionImageSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.afterExecutionImageFile = file;
            this.previewImage(file, 'after');
        }
    }

    previewImage(file: File, type: string): void {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            switch (type) {
                case 'banner':
                    this.bannerImagePreview = e.target.result;
                    break;
                case 'before':
                    this.beforeExecutionImagePreview = e.target.result;
                    break;
                case 'after':
                    this.afterExecutionImagePreview = e.target.result;
                    break;
            }
        };
        reader.readAsDataURL(file);
    }

    removeImage(type: string): void {
        switch (type) {
            case 'banner':
                this.bannerImageFile = null;
                this.bannerImagePreview = null;
                break;
            case 'before':
                this.beforeExecutionImageFile = null;
                this.beforeExecutionImagePreview = null;
                break;
            case 'after':
                this.afterExecutionImageFile = null;
                this.afterExecutionImagePreview = null;
                break;
        }
    }

    canShowAfterExecution(): boolean {
        return this.storeAssignment?.vendorWorkStatus === 'Before Execution' ||
            this.storeAssignment?.vendorWorkStatus === 'After Execution';
    }

    canMarkAsComplete(): boolean {
        return this.storeAssignment?.vendorWorkStatus === 'After Execution' &&
            this.beforeExecutionImagePreview !== null &&
            this.afterExecutionImagePreview !== null;
    }

    onSubmit(): void {
        if (this.storeForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.formLoading = true;

        const formData = new FormData();

        // Add form fields
        formData.append('boardWidth', this.storeForm.get('boardWidth')?.value);
        formData.append('boardHeight', this.storeForm.get('boardHeight')?.value);
        formData.append('notes', this.storeForm.get('notes')?.value || '');

        // Add image files
        if (this.bannerImageFile) {
            formData.append('bannerImageFile', this.bannerImageFile);
        }
        if (this.beforeExecutionImageFile) {
            formData.append('beforeExecutionImageFile', this.beforeExecutionImageFile);
        }
        if (this.afterExecutionImageFile) {
            formData.append('afterExecutionImageFile', this.afterExecutionImageFile);
        }

        this.vendorAssignmentService.updateStoreForm(this.storeAssignmentId, formData).subscribe({
            next: (updatedStore) => {
                this.storeAssignment = updatedStore;
                this.formLoading = false;

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Store form updated successfully!',
                    confirmButtonColor: '#3085d6'
                }).then(() => {
                    // Navigate to store view
                    this.router.navigate(['/vendor-store-view', this.storeAssignmentId]);
                });
            },
            error: (error) => {
                console.error('Error updating store form:', error);
                this.formLoading = false;

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || 'Failed to update store form. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
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
                this.formLoading = true;

                this.vendorAssignmentService.markStoreAsComplete(this.storeAssignmentId).subscribe({
                    next: (updatedStore) => {
                        this.storeAssignment = updatedStore;
                        this.formLoading = false;

                        Swal.fire({
                            icon: 'success',
                            title: 'Completed!',
                            text: 'Store has been marked as complete successfully!',
                            confirmButtonColor: '#3085d6'
                        }).then(() => {
                            // Navigate to store view
                            this.router.navigate(['/vendor-store-view', this.storeAssignmentId]);
                        });
                    },
                    error: (error) => {
                        console.error('Error marking store as complete:', error);
                        this.formLoading = false;

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

    markFormGroupTouched(): void {
        Object.keys(this.storeForm.controls).forEach(key => {
            const control = this.storeForm.get(key);
            control?.markAsTouched();
        });
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
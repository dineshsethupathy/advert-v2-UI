import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAssignmentService, StoreAssignment, Board, StoreFormResponse } from '../../services/vendor-assignment.service';
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
    boards: Board[] = [];
    isBoardDropdownOpen = false;
    selectedBoardText: string = 'Select board type';

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
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        this.storeForm = this.fb.group({
            boardId: [null, [Validators.required]],
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

        // Subscribe to form value changes to update custom dropdown
        this.storeForm.get('boardId')?.valueChanges.subscribe(value => {
            this.cdr.detectChanges();
        });
    }

    // Boards are now loaded with the store form data
    loadBoards(): void {
        // This method is no longer needed as boards are loaded with store form
    }

    // Custom dropdown methods
    toggleBoardDropdown(): void {
        this.isBoardDropdownOpen = !this.isBoardDropdownOpen;
    }

    selectBoard(boardId: number, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        this.storeForm.patchValue({ boardId: boardId });
        this.isBoardDropdownOpen = false;

        // Update the selected board text
        this.getSelectedBoardText();
    }

    getSelectedBoardText(): string {
        const selectedBoardId = this.storeForm.get('boardId')?.value;
        console.log('getSelectedBoardText called, selectedBoardId:', selectedBoardId);
        console.log('Available boards:', this.boards);
        console.log('Form value:', this.storeForm.value);

        if (!selectedBoardId) {
            this.selectedBoardText = 'Select board type';
            return this.selectedBoardText;
        }
        const selectedBoard = this.boards.find(board => board.id === selectedBoardId);
        console.log('Found selected board:', selectedBoard);
        this.selectedBoardText = selectedBoard ? selectedBoard.name : 'Select board type';
        return this.selectedBoardText;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Close board dropdown if clicked outside
        if (!target.closest('.custom-select')) {
            this.isBoardDropdownOpen = false;
        }
    }

    loadStoreForm(): void {
        this.loading = true;
        this.vendorAssignmentService.getStoreForm(this.storeAssignmentId).subscribe({
            next: (response) => {
                console.log('loadStoreForm response:', response);
                console.log('storeForm data:', response.storeForm);
                console.log('availableBoards:', response.availableBoards);

                this.storeAssignment = response.storeForm;
                this.boards = response.availableBoards;

                // Wait for both data to be loaded before initializing form
                setTimeout(() => {
                    this.initializeForm();
                }, 100);

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
            console.log('initializeForm called with storeAssignment:', this.storeAssignment);
            console.log('storeAssignment.boardId:', this.storeAssignment.boardId);
            console.log('storeAssignment.boardWidth:', this.storeAssignment.boardWidth);
            console.log('storeAssignment.boardHeight:', this.storeAssignment.boardHeight);

            // Use setTimeout to ensure the form is fully ready
            setTimeout(() => {
                if (this.storeAssignment) {
                    console.log('Setting form values...');
                    this.storeForm.patchValue({
                        boardId: this.storeAssignment.boardId || null,
                        boardWidth: this.storeAssignment.boardWidth || null,
                        boardHeight: this.storeAssignment.boardHeight || null,
                        notes: this.storeAssignment.vendorNotes || ''
                    });

                    console.log('Form values after patch:', this.storeForm.value);
                    console.log('Form boardId after patch:', this.storeForm.get('boardId')?.value);

                    // Update the selected board text
                    this.getSelectedBoardText();

                    // Force change detection to update the custom dropdown
                    this.cdr.detectChanges();
                }
            }, 0);

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
        formData.append('boardId', this.storeForm.get('boardId')?.value);
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
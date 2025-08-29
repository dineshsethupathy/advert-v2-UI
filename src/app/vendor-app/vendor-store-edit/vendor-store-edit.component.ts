import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAssignmentService, StoreAssignment, Board, StoreFormResponse } from '../../services/vendor-assignment.service';
import { VendorHeaderComponent } from '../shared/vendor-header/vendor-header.component';
import { MatDialog } from '@angular/material/dialog';
import { LocationPickerModalComponent } from '../location-picker-modal/location-picker-modal.component';
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

    // GPS Location
    gpsLocation: { address: string; coords: string; gpsString: string } | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private vendorAssignmentService: VendorAssignmentService,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef,
        private dialog: MatDialog
    ) {
        this.storeForm = this.fb.group({
            boardId: [null, [Validators.required]],
            boardWidth: [null, [Validators.required, Validators.min(1), Validators.max(1000)]],
            boardHeight: [null, [Validators.required, Validators.min(1), Validators.max(1000)]],
            boardCost: [null, [Validators.required, Validators.min(0.01), Validators.max(10000)]],
            hasPole: [false],
            poleQuantity: [null, [Validators.min(1), Validators.max(100)]],
            poleWidth: [null, [Validators.min(0.1), Validators.max(100)]],
            poleHeight: [null, [Validators.min(0.1), Validators.max(1000)]],
            poleCost: [null, [Validators.min(0.01), Validators.max(10000)]],
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

        // Subscribe to pole checkbox changes to handle validation
        this.storeForm.get('hasPole')?.valueChanges.subscribe(hasPole => {
            this.handlePoleCheckboxChange(hasPole);
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
            console.log('storeAssignment.poleQuantity:', this.storeAssignment.poleQuantity);

            // Use setTimeout to ensure the form is fully ready
            setTimeout(() => {
                if (this.storeAssignment) {
                    console.log('Setting form values...');

                    // Determine if pole checkbox should be checked based on poleQuantity
                    const hasPole = this.storeAssignment.poleQuantity != null && this.storeAssignment.poleQuantity > 0;

                    this.storeForm.patchValue({
                        boardId: this.storeAssignment.boardId || null,
                        boardWidth: this.storeAssignment.boardWidth || null,
                        boardHeight: this.storeAssignment.boardHeight || null,
                        boardCost: this.storeAssignment.boardCost || null,
                        hasPole: hasPole,
                        poleQuantity: this.storeAssignment.poleQuantity || null,
                        poleWidth: this.storeAssignment.poleWidth || null,
                        poleHeight: this.storeAssignment.poleHeight || null,
                        poleCost: this.storeAssignment.poleCost || null,
                        notes: this.storeAssignment.vendorNotes || ''
                    });

                    console.log('Form values after patch:', this.storeForm.value);
                    console.log('Form boardId after patch:', this.storeForm.get('boardId')?.value);
                    console.log('Form hasPole after patch:', this.storeForm.get('hasPole')?.value);
                    console.log('Form poleQuantity after patch:', this.storeForm.get('poleQuantity')?.value);

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

            // Set GPS location if exists
            if (this.storeAssignment.gpsLocation) {
                this.gpsLocation = this.parseGpsLocation(this.storeAssignment.gpsLocation);
            }
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

    // Check if pole fields are valid when checkbox is checked
    isPoleFieldsValid(): boolean {
        if (!this.storeForm.get('hasPole')?.value) {
            return true; // No validation needed if pole is not selected
        }

        const poleQuantity = this.storeForm.get('poleQuantity')?.value;
        const poleWidth = this.storeForm.get('poleWidth')?.value;
        const poleHeight = this.storeForm.get('poleHeight')?.value;

        return poleQuantity && poleWidth && poleHeight &&
            poleQuantity >= 1 && poleQuantity <= 100 &&
            poleWidth >= 0.1 && poleWidth <= 100 &&
            poleHeight >= 0.1 && poleHeight <= 1000;
    }

    // Check if form is valid including pole fields
    isFormValid(): boolean {
        return this.storeForm.valid && this.isPoleFieldsValid();
    }

    onSubmit(): void {
        // Check pole validation before submitting
        if (this.storeForm.get('hasPole')?.value) {
            const poleQuantity = this.storeForm.get('poleQuantity')?.value;
            const poleWidth = this.storeForm.get('poleWidth')?.value;
            const poleHeight = this.storeForm.get('poleHeight')?.value;

            if (!poleQuantity || !poleWidth || !poleHeight) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Pole Dimensions Required',
                    text: 'Please enter pole quantity, width and height when pole is selected.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }
        }

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
        formData.append('boardCost', this.storeForm.get('boardCost')?.value || '');
        formData.append('notes', this.storeForm.get('notes')?.value || '');

        // Handle pole fields - if checkbox is unchecked, send null values
        if (this.storeForm.get('hasPole')?.value) {
            formData.append('poleQuantity', this.storeForm.get('poleQuantity')?.value || '');
            formData.append('poleWidth', this.storeForm.get('poleWidth')?.value || '');
            formData.append('poleHeight', this.storeForm.get('poleHeight')?.value || '');
            formData.append('poleCost', this.storeForm.get('poleCost')?.value || '');
        } else {
            // When checkbox is unchecked, send empty strings to indicate pole fields should be cleared
            formData.append('poleQuantity', '');
            formData.append('poleWidth', '');
            formData.append('poleHeight', '');
            formData.append('poleCost', '');
        }

        // Add GPS location field
        if (this.gpsLocation) {
            formData.append('gpsLocation', this.gpsLocation.gpsString);
        }

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
        console.log('formData:', formData);

        this.vendorAssignmentService.updateStoreForm(this.storeAssignmentId, formData).subscribe({
            next: (updatedStore) => {
                this.storeAssignment = updatedStore;
                this.formLoading = false;

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Store form updated successfully!',
                    showConfirmButton: false,
                    // confirmButtonColor: '#3085d6',
                    timer: 1500
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
                            // confirmButtonColor: '#3085d6',
                            showConfirmButton: false,
                            timer: 1500
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

    // GPS Location Methods
    openLocationPicker(): void {
        let coords = null;
        if (this.gpsLocation) {
            try {
                const [lat, lng] = this.gpsLocation.coords.split(',').map((v: string) => parseFloat(v.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    coords = { lat, lng };
                }
            } catch { }
        }

        const dialogRef = this.dialog.open(LocationPickerModalComponent, {
            width: '90vw',
            maxWidth: '500px',
            data: { coords }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result && result.address && result.coords && result.gpsString) {
                this.gpsLocation = {
                    address: result.address,
                    coords: result.coords,
                    gpsString: result.gpsString
                };
                this.cdr.detectChanges();
            }
        });
    }

    removeGpsLocation(): void {
        this.gpsLocation = null;
        this.cdr.detectChanges();
    }

    // Parse GPS location from string format (address|lat|lng)
    parseGpsLocation(gpsString: string): { address: string; coords: string; gpsString: string } | null {
        if (!gpsString) return null;

        try {
            const parts = gpsString.split('|');
            if (parts.length >= 3) {
                const address = parts[0];
                const lat = parseFloat(parts[1]);
                const lng = parseFloat(parts[2]);

                if (!isNaN(lat) && !isNaN(lng)) {
                    return {
                        address: address,
                        coords: `${lat}, ${lng}`,
                        gpsString: gpsString  // Keep original format for backend
                    };
                }
            }
        } catch (error) {
            console.error('Error parsing GPS location:', error);
        }

        return null;
    }

    // Format coordinates for display with 3 decimal points
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

    // Handle pole checkbox changes
    handlePoleCheckboxChange(hasPole: boolean): void {
        if (hasPole) {
            // Add required validators when checkbox is checked
            this.storeForm.get('poleQuantity')?.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
            this.storeForm.get('poleWidth')?.setValidators([Validators.required, Validators.min(0.1), Validators.max(1000)]);
            this.storeForm.get('poleHeight')?.setValidators([Validators.required, Validators.min(0.1), Validators.max(1000)]);
            this.storeForm.get('poleCost')?.setValidators([Validators.required, Validators.min(0.01), Validators.max(10000)]);
        } else {
            // Clear validators when checkbox is unchecked
            this.storeForm.get('poleQuantity')?.clearValidators();
            this.storeForm.get('poleWidth')?.clearValidators();
            this.storeForm.get('poleHeight')?.clearValidators();
            this.storeForm.get('poleCost')?.clearValidators();
            // Clear the values when unchecked - this will send null to backend
            this.storeForm.get('poleQuantity')?.setValue(null);
            this.storeForm.get('poleWidth')?.setValue(null);
            this.storeForm.get('poleHeight')?.setValue(null);
            this.storeForm.get('poleCost')?.setValue(null);
        }

        // Update validation state
        this.storeForm.get('poleQuantity')?.updateValueAndValidity();
        this.storeForm.get('poleWidth')?.updateValueAndValidity();
        this.storeForm.get('poleHeight')?.updateValueAndValidity();
        this.storeForm.get('poleCost')?.updateValueAndValidity();
    }
}  
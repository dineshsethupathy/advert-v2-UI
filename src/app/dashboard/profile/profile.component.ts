import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfileComponent implements OnInit, AfterViewInit {
    @ViewChild('signatureCanvas', { static: false }) signatureCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

    currentUser: CurrentUser | null = null;
    userProfile: User | null = null;
    loading = false;
    editing = false;
    formSubmitted = false;

    // Signature related properties
    userSignature: string | null = null;
    showSignatureModal = false;
    activeTab: 'draw' | 'upload' = 'draw';
    isDragOver = false;
    uploadedImage: string | null = null;
    savingSignature = false;

    // Canvas drawing properties
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private isDrawing = false;
    private lastX = 0;
    private lastY = 0;
    private drawingHistory: ImageData[] = [];
    private currentStep = -1;

    profileForm: FormGroup;

    constructor(
        private userService: UserService,
        private authService: AuthService,
        private fb: FormBuilder
    ) {
        this.profileForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]]
        });
    }

    ngOnInit(): void {
        this.loadCurrentUser();
        this.loadUserProfile();
    }

    ngAfterViewInit(): void {
        this.initializeCanvas();
    }

    loadCurrentUser(): void {
        this.currentUser = this.authService.getCurrentUserValue();
    }

    loadUserProfile(): void {
        if (!this.currentUser) return;

        this.loading = true;
        this.userService.getUserById(this.currentUser.userId).subscribe({
            next: (user) => {
                this.userProfile = user;
                this.populateForm(user);
                this.loadUserSignature();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading user profile:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load user profile'
                });
            }
        });
    }

    loadUserSignature(): void {
        // Load user signature from the userProfile data loaded from backend
        if (this.userProfile && this.userProfile.signature) {
            this.userSignature = this.userProfile.signature;
        } else {
            this.userSignature = null;
        }
    }

    populateForm(user: User): void {
        this.profileForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        });
    }

    toggleEdit(): void {
        this.editing = !this.editing;
        if (this.editing) {
            this.populateForm(this.userProfile!);
        }
    }

    saveProfile(): void {
        if (this.profileForm.invalid) {
            this.formSubmitted = true;
            return;
        }

        if (!this.userProfile) return;

        const updateData = {
            id: this.userProfile.id,
            ...this.profileForm.value,
            roleId: this.userProfile.roleId
        };

        this.userService.updateUser(updateData).subscribe({
            next: (updatedUser) => {
                this.userProfile = updatedUser;
                this.editing = false;
                this.formSubmitted = false;

                // Update current user in auth service
                if (this.currentUser) {
                    this.currentUser.firstName = updatedUser.firstName;
                    this.currentUser.lastName = updatedUser.lastName;
                    this.currentUser.email = updatedUser.email;
                    this.authService.updateCurrentUser(this.currentUser);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Profile updated successfully'
                });
            },
            error: (error) => {
                console.error('Error updating profile:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update profile'
                });
            }
        });
    }

    cancelEdit(): void {
        this.editing = false;
        this.formSubmitted = false;
        this.populateForm(this.userProfile!);
    }

    getFormControl(name: string) {
        return this.profileForm.get(name);
    }

    // Signature Modal Methods
    openSignatureModal(): void {
        this.showSignatureModal = true;
        this.activeTab = 'draw';
        this.uploadedImage = null;
        setTimeout(() => {
            this.initializeCanvas();
        }, 100);
    }

    closeSignatureModal(): void {
        this.showSignatureModal = false;
        this.uploadedImage = null;
        this.clearCanvas();
    }

    setActiveTab(tab: 'draw' | 'upload'): void {
        this.activeTab = tab;
        if (tab === 'draw') {
            setTimeout(() => {
                this.initializeCanvas();
            }, 100);
        }
    }

    // Canvas Drawing Methods
    private initializeCanvas(): void {
        if (!this.signatureCanvas) return;

        this.canvas = this.signatureCanvas.nativeElement;
        this.ctx = this.canvas.getContext('2d')!;

        // Set canvas size
        this.canvas.width = 400;
        this.canvas.height = 200;

        // Set drawing style
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Clear canvas and save initial state
        this.clearCanvas();
    }

    startDrawing(event: MouseEvent): void {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = event.clientX - rect.left;
        this.lastY = event.clientY - rect.top;
    }

    draw(event: MouseEvent): void {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();

        this.lastX = currentX;
        this.lastY = currentY;
    }

    stopDrawing(): void {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveCanvasState();
        }
    }

    private saveCanvasState(): void {
        if (this.currentStep < this.drawingHistory.length - 1) {
            this.drawingHistory = this.drawingHistory.slice(0, this.currentStep + 1);
        }
        this.drawingHistory.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
        this.currentStep = this.drawingHistory.length - 1;
    }

    clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawingHistory = [];
        this.currentStep = -1;
    }

    undoLastStroke(): void {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.ctx.putImageData(this.drawingHistory[this.currentStep], 0, 0);
        } else if (this.currentStep === 0) {
            this.clearCanvas();
        }
    }

    // File Upload Methods
    triggerFileInput(): void {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = true;
    }

    onFileDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.processFile(files[0]);
        }
    }

    private processFile(file: File): void {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid File',
                text: 'Please select an image file'
            });
            return;
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Too Large',
                text: 'Please select an image smaller than 2MB'
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.uploadedImage = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    removeUploadedImage(): void {
        this.uploadedImage = null;
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    // Signature Management Methods
    canSaveSignature(): boolean {
        if (this.activeTab === 'upload') {
            return !!this.uploadedImage;
        } else {
            return this.drawingHistory.length > 0;
        }
    }

    saveSignature(): void {
        let signatureData: string;

        if (this.activeTab === 'upload' && this.uploadedImage) {
            signatureData = this.uploadedImage;
        } else if (this.activeTab === 'draw' && this.drawingHistory.length > 0) {
            signatureData = this.canvas.toDataURL('image/png');
        } else {
            return;
        }

        // Set loading state
        this.savingSignature = true;

        // Save signature to backend
        if (this.currentUser) {
            this.userService.updateSignature({
                id: this.currentUser.userId,
                signature: signatureData
            }).subscribe({
                next: (updatedUser) => {
                    this.userSignature = signatureData;

                    // Update the userProfile with the new signature data
                    if (this.userProfile) {
                        this.userProfile.signature = updatedUser.signature;
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Signature Saved',
                        text: 'Your signature has been saved successfully',
                        timer: 1500,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });

                    this.closeSignatureModal();
                    this.savingSignature = false;
                },
                error: (error) => {
                    console.error('Error saving signature:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to save signature. Please try again.'
                    });
                    this.savingSignature = false;
                }
            });
        }
    }

    removeSignature(): void {
        Swal.fire({
            title: 'Remove Signature',
            text: 'Are you sure you want to remove your signature?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, remove it'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userSignature = null;
                // TODO: Remove signature from backend

                Swal.fire({
                    icon: 'success',
                    title: 'Signature Removed',
                    text: 'Your signature has been removed'
                });
            }
        });
    }
}

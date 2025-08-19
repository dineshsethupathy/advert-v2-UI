import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { VendorService, Vendor, CreateVendorRequest, UpdateVendorRequest } from '../../services/vendor.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './vendor.component.html',
    styleUrl: './vendor.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorComponent implements OnInit {
    vendors: Vendor[] = [];
    loading = false;
    formLoading = false;
    showAddForm = false;
    editingVendor: Vendor | null = null;
    errorMessage = '';
    showError = false;

    // Form data
    vendorForm = {
        email: ''
    };

    constructor(
        private authService: AuthService,
        private vendorService: VendorService
    ) { }

    ngOnInit(): void {
        this.loadVendors();
    }

    loadVendors(): void {
        this.loading = true;
        this.vendorService.getVendors().subscribe({
            next: (vendors) => {
                this.vendors = vendors;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading vendors:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load vendors. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    showAddVendorForm(): void {
        this.showAddForm = true;
        this.editingVendor = null;
        this.resetForm();
    }

    editVendor(vendor: Vendor): void {
        this.editingVendor = vendor;
        this.showAddForm = true;
        this.vendorForm = {
            email: vendor.email
        };
    }

    cancelForm(): void {
        this.showAddForm = false;
        this.editingVendor = null;
        this.resetForm();
        this.hideErrorMessage();
    }

    resetForm(): void {
        this.vendorForm = {
            email: ''
        };
    }

    saveVendor(): void {
        if (!this.vendorForm.email.trim()) {
            this.showErrorMessage('Vendor email is required');
            return;
        }

        this.formLoading = true;

        if (this.editingVendor) {
            // Update existing vendor
            const updatedVendor: UpdateVendorRequest = {
                id: this.editingVendor.id,
                email: this.vendorForm.email,
                firstName: this.editingVendor.firstName,
                lastName: this.editingVendor.lastName,
                phoneNumber: this.editingVendor.phoneNumber,
                isActive: this.editingVendor.isActive
            };

            this.vendorService.updateVendor(updatedVendor).subscribe({
                next: () => {
                    this.loadVendors();
                    this.cancelForm();
                    this.formLoading = false;
                },
                error: (error) => {
                    console.error('Error updating vendor:', error);
                    const errorMessage = error.error?.message || 'Error updating vendor';
                    this.showErrorMessage(errorMessage);
                    this.formLoading = false;
                }
            });
        } else {
            // Create new vendor
            const newVendor: CreateVendorRequest = {
                email: this.vendorForm.email
            };

            this.vendorService.createVendor(newVendor).subscribe({
                next: () => {
                    this.loadVendors();
                    this.cancelForm();
                    this.formLoading = false;
                },
                error: (error) => {
                    console.error('Error creating vendor:', error);
                    const errorMessage = error.error?.message || 'Error creating vendor';
                    this.showErrorMessage(errorMessage);
                    this.formLoading = false;
                }
            });
        }
    }

    deleteVendor(vendor: Vendor): void {
        Swal.fire({
            title: 'Delete Vendor',
            text: `Are you sure you want to delete "${vendor.email}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.vendorService.deleteVendor(vendor.id).subscribe({
                    next: () => {
                        this.vendors = this.vendors.filter(v => v.id !== vendor.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Vendor has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting vendor:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete vendor. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    showErrorMessage(message: string): void {
        this.errorMessage = message;
        this.showError = true;
        setTimeout(() => {
            this.hideErrorMessage();
        }, 4000);
    }

    hideErrorMessage(): void {
        this.showError = false;
        this.errorMessage = '';
    }

    getSaveButtonText(): string {
        return this.editingVendor ? 'Update Vendor' : 'Create Vendor';
    }

    getFullName(vendor: Vendor): string {
        if (vendor.firstName && vendor.lastName) {
            return `${vendor.firstName} ${vendor.lastName}`;
        } else if (vendor.firstName) {
            return vendor.firstName;
        } else if (vendor.lastName) {
            return vendor.lastName;
        } else {
            return '_';
        }
    }

    getStatusText(vendor: Vendor): string {
        if (!vendor.isActive) {
            return 'Inactive';
        }
        if (!vendor.lastLoginAt) {
            return 'Never logged in';
        }
        return 'Active';
    }

    getStatusClass(vendor: Vendor): string {
        if (!vendor.isActive) {
            return 'status-inactive';
        }
        if (!vendor.lastLoginAt) {
            return 'status-never-logged';
        }
        return 'status-active';
    }
} 
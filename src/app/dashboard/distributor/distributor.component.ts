import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DistributorService, Distributor, CreateDistributorRequest, UpdateDistributorRequest } from '../../services/distributor.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-distributor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './distributor.component.html',
    styleUrl: './distributor.component.css'
})
export class DistributorComponent implements OnInit {
    distributors: Distributor[] = [];
    loading = false;
    showAddForm = false;
    editingDistributor: Distributor | null = null;
    errorMessage = '';
    showError = false;

    // Form data
    distributorForm = {
        email: ''
    };

    constructor(
        private authService: AuthService,
        private distributorService: DistributorService
    ) { }

    ngOnInit(): void {
        this.loadDistributors();
    }

    loadDistributors(): void {
        this.loading = true;
        this.distributorService.getDistributors().subscribe({
            next: (distributors) => {
                this.distributors = distributors;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading distributors:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load distributors. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    showAddDistributorForm(): void {
        this.showAddForm = true;
        this.editingDistributor = null;
        this.resetForm();
    }

    editDistributor(distributor: Distributor): void {
        this.editingDistributor = distributor;
        this.showAddForm = true;
        this.distributorForm = {
            email: distributor.email
        };
    }

    cancelForm(): void {
        this.showAddForm = false;
        this.editingDistributor = null;
        this.resetForm();
        this.hideErrorMessage();
    }

    resetForm(): void {
        this.distributorForm = {
            email: ''
        };
    }

    saveDistributor(): void {
        if (!this.distributorForm.email.trim()) {
            this.showErrorMessage('Distributor email is required');
            return;
        }

        if (this.editingDistributor) {
            // Update existing distributor
            const updatedDistributor: UpdateDistributorRequest = {
                id: this.editingDistributor.id,
                email: this.distributorForm.email,
                firstName: this.editingDistributor.firstName,
                lastName: this.editingDistributor.lastName,
                phoneNumber: this.editingDistributor.phoneNumber,
                isActive: this.editingDistributor.isActive
            };

            this.distributorService.updateDistributor(updatedDistributor).subscribe({
                next: () => {
                    this.loadDistributors();
                    this.cancelForm();
                },
                error: (error) => {
                    console.error('Error updating distributor:', error);
                    const errorMessage = error.error?.message || 'Error updating distributor';
                    this.showErrorMessage(errorMessage);
                }
            });
        } else {
            // Create new distributor
            const newDistributor: CreateDistributorRequest = {
                email: this.distributorForm.email
            };

            this.distributorService.createDistributor(newDistributor).subscribe({
                next: () => {
                    this.loadDistributors();
                    this.cancelForm();
                },
                error: (error) => {
                    console.error('Error creating distributor:', error);
                    const errorMessage = error.error?.message || 'Error creating distributor';
                    this.showErrorMessage(errorMessage);
                }
            });
        }
    }

    deleteDistributor(distributor: Distributor): void {
        Swal.fire({
            title: 'Delete Distributor',
            text: `Are you sure you want to delete "${distributor.email}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.distributorService.deleteDistributor(distributor.id).subscribe({
                    next: () => {
                        this.distributors = this.distributors.filter(d => d.id !== distributor.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Distributor has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting distributor:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete distributor. Please try again.',
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
        return this.editingDistributor ? 'Update Distributor' : 'Create Distributor';
    }

    getFullName(distributor: Distributor): string {
        if (distributor.firstName && distributor.lastName) {
            return `${distributor.firstName} ${distributor.lastName}`;
        } else if (distributor.firstName) {
            return distributor.firstName;
        } else if (distributor.lastName) {
            return distributor.lastName;
        } else {
            return '_';
        }
    }

    getStatusText(distributor: Distributor): string {
        if (!distributor.isActive) {
            return 'Inactive';
        }
        if (!distributor.lastLoginAt) {
            return 'Never logged in';
        }
        return 'Active';
    }

    getStatusClass(distributor: Distributor): string {
        if (!distributor.isActive) {
            return 'status-inactive';
        }
        if (!distributor.lastLoginAt) {
            return 'status-never-logged';
        }
        return 'status-active';
    }
} 
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RegionService } from '../../services/region.service';
import Swal from 'sweetalert2';

export interface Region {
    id: number;
    name: string;
    description: string;
    createdDate: string;
    createdBy: number;
    isDeleted: boolean;
}

@Component({
    selector: 'app-region',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './region.component.html',
    styleUrl: './region.component.css'
})
export class RegionComponent implements OnInit {
    regions: Region[] = [];
    loading = false;
    showAddForm = false;
    editingRegion: Region | null = null;
    errorMessage = '';
    showError = false;

    // Form data
    regionForm = {
        name: '',
        description: ''
    };

    constructor(
        private regionService: RegionService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadRegions();
    }

    loadRegions(): void {
        this.loading = true;
        this.regionService.getRegions().subscribe({
            next: (regions) => {
                this.regions = regions;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading regions:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load regions. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    showAddRegionForm(): void {
        this.showAddForm = true;
        this.editingRegion = null;
        this.resetForm();
    }

    showEditRegionForm(region: Region): void {
        this.editingRegion = region;
        this.showAddForm = true;
        this.regionForm = {
            name: region.name,
            description: region.description
        };
    }

    cancelForm(): void {
        this.showAddForm = false;
        this.editingRegion = null;
        this.resetForm();
    }

    resetForm(): void {
        this.regionForm = {
            name: '',
            description: ''
        };
    }

    saveRegion(): void {
        if (!this.regionForm.name.trim()) {
            this.showErrorMessage('Region name is required');
            return;
        }

        if (this.editingRegion) {
            // Update existing region
            const updatedRegion = {
                ...this.editingRegion,
                name: this.regionForm.name,
                description: this.regionForm.description
            };

            this.regionService.updateRegion(updatedRegion).subscribe({
                next: () => {
                    this.loadRegions();
                    this.cancelForm();
                },
                error: (error) => {
                    console.error('Error updating region:', error);
                    const errorMessage = error.error || 'Error updating region';
                    this.showErrorMessage(errorMessage);
                }
            });
        } else {
            // Create new region
            const newRegion = {
                name: this.regionForm.name,
                description: this.regionForm.description
            };

            this.regionService.createRegion(newRegion).subscribe({
                next: () => {
                    this.loadRegions();
                    this.cancelForm();
                },
                error: (error) => {
                    console.error('Error creating region:', error);
                    const errorMessage = error.error || 'Error creating region';
                    this.showErrorMessage(errorMessage);
                }
            });
        }
    }

    showErrorMessage(message: string): void {
        this.errorMessage = message;
        this.showError = true;

        // Hide error message after 4 seconds
        setTimeout(() => {
            this.showError = false;
            this.errorMessage = '';
        }, 4000);
    }

    deleteRegion(region: Region): void {
        Swal.fire({
            title: 'Delete Region',
            text: `Are you sure you want to delete "${region.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.regionService.deleteRegion(region.id).subscribe({
                    next: () => {
                        this.regions = this.regions.filter(r => r.id !== region.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Region has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting region:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete region. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    getFormTitle(): string {
        return this.editingRegion ? 'Edit Region' : 'Add New Region';
    }

    getSaveButtonText(): string {
        return this.editingRegion ? 'Update Region' : 'Create Region';
    }
} 
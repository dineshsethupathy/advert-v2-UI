import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RegionService } from '../../services/region.service';
import { StatesService, State } from '../../services/states.service';
import Swal from 'sweetalert2';

export interface Region {
    id: number;
    name: string;
    description: string;
    stateId: number;
    stateName?: string;
    createdDate: string;
    createdBy: number;
    isDeleted: boolean;
}

@Component({
    selector: 'app-region',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './region.component.html',
    styleUrl: './region.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegionComponent implements OnInit {
    regions: Region[] = [];
    states: State[] = [];
    filteredStates: State[] = [];
    loading = false;
    showAddModal = false;
    editingRegion: Region | null = null;
    errorMessage = '';
    showError = false;
    isStatesDropdownOpen = false;
    stateSearchText = '';

    // Form data
    regionForm = {
        name: '',
        description: '',
        stateId: 0
    };

    constructor(
        private regionService: RegionService,
        private statesService: StatesService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadStates();
        this.loadRegions();
    }

    loadStates(): void {
        this.statesService.getStates().subscribe({
            next: (states) => {
                this.states = states;
                this.filteredStates = [...states];
            },
            error: (error) => {
                console.error('Error loading states:', error);
            }
        });
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

    showAddRegionModal(): void {
        this.showAddModal = true;
        this.editingRegion = null;
        this.resetForm();
    }

    showEditRegionModal(region: Region): void {
        this.editingRegion = region;
        this.showAddModal = true;
        this.regionForm = {
            name: region.name,
            description: region.description,
            stateId: region.stateId
        };
    }

    closeModal(): void {
        this.showAddModal = false;
        this.editingRegion = null;
        this.resetForm();
    }

    resetForm(): void {
        this.regionForm = {
            name: '',
            description: '',
            stateId: 0
        };
        this.clearStateSearch();
    }

    saveRegion(): void {
        if (!this.regionForm.name.trim()) {
            this.showErrorMessage('Region name is required');
            return;
        }

        if (!this.regionForm.stateId) {
            this.showErrorMessage('Please select a state');
            return;
        }

        if (this.editingRegion) {
            // Update existing region
            const updatedRegion = {
                id: this.editingRegion.id,
                name: this.regionForm.name,
                description: this.regionForm.description,
                stateId: this.regionForm.stateId
            };

            this.regionService.updateRegion(updatedRegion).subscribe({
                next: () => {
                    this.loadRegions();
                    this.closeModal();
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
                description: this.regionForm.description,
                stateId: this.regionForm.stateId
            };

            this.regionService.createRegion(newRegion).subscribe({
                next: () => {
                    this.loadRegions();
                    this.closeModal();
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

    toggleStatesDropdown(): void {
        this.isStatesDropdownOpen = !this.isStatesDropdownOpen;
        if (this.isStatesDropdownOpen) {
            // Focus the input field for typing when dropdown opens
            setTimeout(() => {
                const selectInput = document.querySelector('.select-input') as HTMLInputElement;
                if (selectInput) {
                    selectInput.focus();
                    selectInput.select(); // Select all text for easy replacement
                }
            }, 100);
        }
    }

    selectState(stateId: number, stateName: string, event: Event): void {
        event.stopPropagation();
        this.regionForm.stateId = stateId;
        this.stateSearchText = ''; // Clear search text when state is selected
        this.isStatesDropdownOpen = false;
    }

    getSelectedStateText(): string {
        if (!this.regionForm.stateId) {
            return 'Select a state';
        }
        const selectedState = this.states.find(state => state.id === this.regionForm.stateId);
        return selectedState ? selectedState.name : 'Select a state';
    }

    getPlaceholderText(): string {
        if (this.stateSearchText) {
            return this.stateSearchText;
        }
        return this.getSelectedStateText();
    }

    getStateName(stateId: number): string {
        const state = this.states.find(s => s.id === stateId);
        return state ? state.name : 'Unknown State';
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Close states dropdown if clicking outside
        if (!target.closest('.custom-select')) {
            this.onDropdownClose();
        }
    }

    filterStates(searchText: string): void {
        this.stateSearchText = searchText;
        if (!searchText.trim()) {
            this.filteredStates = [...this.states];
        } else {
            this.filteredStates = this.states.filter(state =>
                state.name.toLowerCase().includes(searchText.toLowerCase())
            );
        }
    }

    onStateSearchInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.filterStates(input.value);

        // Make sure dropdown is open when typing
        if (!this.isStatesDropdownOpen) {
            this.isStatesDropdownOpen = true;
        }
    }

    clearStateSearch(): void {
        this.stateSearchText = '';
        this.filteredStates = [...this.states];
    }

    onStateSearchKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.isStatesDropdownOpen = false;
            this.clearStateSearch();
        }
    }

    onDropdownClose(): void {
        this.isStatesDropdownOpen = false;
        this.clearStateSearch();
    }
} 
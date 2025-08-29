import { Component, OnInit, OnDestroy, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RegionService, Region } from '../../services/region.service';
import { StoresService, Store, CreateStoreRequest, UpdateStoreRequest, ImportResponse } from '../../services/stores.service';
import Swal from 'sweetalert2';

export interface ShopOutlet {
    id: number;
    name: string;
    sapId: string;
    phoneNumber?: string;
    address?: string;
    regionId: number;
    regionName: string;
    createdBy: string;
}

@Component({
    selector: 'app-shop-outlets',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './shop-outlets.component.html',
    styleUrl: './shop-outlets.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ShopOutletsComponent implements OnInit, OnDestroy {
    shops: ShopOutlet[] = [];
    regions: Region[] = [];
    filteredShops: ShopOutlet[] = [];
    selectedRegionFilters: number[] = [];
    loading = false;
    formLoading = false;
    showForm = false;
    editingShop: ShopOutlet | null = null;
    errorMessage = '';
    successMessage = '';
    shopForm: FormGroup;
    selectedFile: File | null = null;
    importLoading = false;
    formSubmitted = false;
    isRegionDropdownOpen = false;
    isFilterDropdownOpen = false;
    private isInitialized = false;

    constructor(
        private http: HttpClient,
        private regionService: RegionService,
        private storesService: StoresService,
        private fb: FormBuilder
    ) {
        this.shopForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            sapId: ['', [Validators.required, Validators.minLength(1)]],
            phoneNumber: ['', [Validators.pattern(/^\d{10}$/)]],
            address: ['', [Validators.maxLength(500)]],
            regionId: ['', [Validators.required]]
        });
    }

    ngOnInit(): void {
        // console.log('ShopOutletsComponent ngOnInit() called');

        // Prevent duplicate initialization
        if (this.isInitialized) {
            // console.log('Component already initialized, skipping...');
            return;
        }

        this.isInitialized = true;
        this.loadShops();
        this.loadRegions();
    }

    ngOnDestroy(): void {
        // console.log('ShopOutletsComponent ngOnDestroy() called');
        this.isInitialized = false;
        // Cleanup if needed
    }

    loadShops(): void {
        // Prevent duplicate calls if already loading
        if (this.loading) {
            // console.log('loadShops() called while already loading, skipping...');
            return;
        }

        // console.log('loadShops() called');
        this.loading = true;
        this.storesService.getStores().subscribe({
            next: (stores) => {
                // console.log('Stores loaded:', stores.length);
                this.shops = stores.map(store => ({
                    id: store.id,
                    name: store.name,
                    sapId: store.sapId,
                    phoneNumber: store.phoneNumber,
                    address: store.address,
                    regionId: store.regionId,
                    regionName: store.regionName,
                    createdBy: store.createdBy
                }));
                this.filterShops();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading shops:', error);
                this.errorMessage = 'Failed to load shops';
                this.loading = false;
            }
        });
    }

    loadRegions(): void {
        this.regionService.getRegions().subscribe({
            next: (regions) => {
                this.regions = regions.filter(region => !region.isDeleted);
                // console.log('Loaded regions:', this.regions);
            },
            error: (error) => {
                console.error('Error loading regions:', error);
                this.errorMessage = 'Failed to load regions';
            }
        });
    }

    showAddForm(): void {
        this.editingShop = null;
        this.shopForm.reset({
            name: '',
            sapId: '',
            phoneNumber: '',
            address: '',
            regionId: ''
        });
        console.log('Form after reset:', this.shopForm.value);
        this.formSubmitted = false;
        this.isRegionDropdownOpen = false;
        this.showForm = true;
        this.errorMessage = '';
        this.successMessage = '';
    }

    showEditForm(shop: ShopOutlet): void {
        this.editingShop = shop;
        this.shopForm.patchValue({
            name: shop.name,
            sapId: shop.sapId,
            phoneNumber: shop.phoneNumber || '',
            address: shop.address || '',
            regionId: shop.regionId
        });
        this.formSubmitted = false;
        this.isRegionDropdownOpen = false;
        this.showForm = true;
        this.errorMessage = '';
        this.successMessage = '';
    }

    closeForm(): void {
        this.showForm = false;
        this.editingShop = null;
        this.shopForm.reset({
            name: '',
            sapId: '',
            phoneNumber: '',
            address: '',
            regionId: ''
        });
        this.formSubmitted = false;
        this.isRegionDropdownOpen = false;
        this.errorMessage = '';
        this.successMessage = '';
    }

    onSubmit(): void {
        this.formSubmitted = true;

        if (this.shopForm.valid) {
            const formData = this.shopForm.value;

            if (this.editingShop) {
                this.updateShop(this.editingShop.id, formData);
            } else {
                this.createShop(formData);
            }
        } else {
            this.errorMessage = 'Please fill in all required fields correctly';
        }
    }

    createShop(shopData: CreateStoreRequest): void {
        this.formLoading = true;
        this.storesService.createStore(shopData).subscribe({
            next: (newShop) => {
                this.shops.unshift(newShop);
                this.filterShops();
                this.closeForm();
                // this.successMessage = 'Shop created successfully';
                this.formLoading = false;
            },
            error: (error) => {
                console.error('Error creating shop:', error);
                this.errorMessage = 'Failed to create shop';
                this.formLoading = false;
            }
        });
    }

    updateShop(id: number, shopData: UpdateStoreRequest): void {
        this.formLoading = true;
        this.storesService.updateStore(id, shopData).subscribe({
            next: (updatedShop) => {
                const index = this.shops.findIndex(shop => shop.id === id);
                if (index !== -1) {
                    this.shops[index] = updatedShop;
                    this.filterShops();
                }
                this.closeForm();
                // this.successMessage = 'Shop updated successfully';
                this.formLoading = false;
            },
            error: (error) => {
                console.error('Error updating shop:', error);
                this.errorMessage = 'Failed to update shop';
                this.formLoading = false;
            }
        });
    }

    deleteShop(shop: ShopOutlet): void {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${shop.name}". This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.onDeleteConfirm(shop);
            }
        });
    }

    onDeleteConfirm(shop: ShopOutlet): void {
        this.loading = true;
        this.storesService.deleteStore(shop.id).subscribe({
            next: () => {
                this.shops = this.shops.filter(s => s.id !== shop.id);
                this.filterShops();
                // this.successMessage = 'Shop deleted successfully';
                this.loading = false;
                Swal.fire({
                    title: 'Deleted!',
                    text: `Shop "${shop.name}" has been deleted.`,
                    icon: 'success',
                    confirmButtonColor: '#10da36'
                });
            },
            error: (error) => {
                console.error('Error deleting shop:', error.error.error);
                this.errorMessage = 'Failed to delete shop';
                this.loading = false;

                // Extract error message from backend response
                let errorMessage = 'Internal error message occurred';
                if (error.error && error.error.error) {
                    if (error.error.error.includes('Cannot delete store with active assignments')) {
                        errorMessage = 'Cannot delete outlet with active assignments';
                    }
                }

                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    onDeleteCancel(): void {
        // No action needed here as SweetAlert2 handles cancellation
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];

        if (file) {
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                this.errorMessage = 'Please select a valid CSV file';
                this.selectedFile = null;
                // Reset the file input
                event.target.value = '';
                return;
            }

            // Validate file size (optional - 5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                this.errorMessage = 'File size must be less than 5MB';
                this.selectedFile = null;
                event.target.value = '';
                return;
            }

            this.selectedFile = file;
            this.errorMessage = ''; // Clear any previous errors
        } else {
            this.selectedFile = null;
        }
    }

    clearFileSelection(): void {
        this.selectedFile = null;
        this.errorMessage = '';
        // Reset the file input element
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    importShops(): void {
        if (!this.selectedFile) {
            this.errorMessage = 'Please select a CSV file';
            return;
        }

        this.importLoading = true;
        this.errorMessage = ''; // Clear any previous errors

        this.storesService.importStores(this.selectedFile).subscribe({
            next: (response: ImportResponse) => {
                this.loadShops(); // Reload shops after import
                this.resetFileInput();
                this.importLoading = false;

                // Show success message with SweetAlert2
                Swal.fire({
                    title: 'Import Successful!',
                    text: response.message,
                    icon: 'success',
                    confirmButtonColor: '#28a745'
                });
            },
            error: (error) => {
                console.error('Error importing shops:', error);
                this.importLoading = false;

                let errorMessage = 'Failed to import shops. Please check your CSV file and try again.';

                // Try to extract more specific error message from the response
                if (error.error && error.error.message) {
                    errorMessage = error.error.message;
                } else if (error.status === 400) {
                    errorMessage = 'Invalid file format or missing required fields.';
                } else if (error.status === 413) {
                    errorMessage = 'File size is too large. Please use a smaller file.';
                } else if (error.status === 401) {
                    errorMessage = 'Authentication required. Please log in again.';
                } else if (error.status === 500) {
                    errorMessage = 'Server error occurred. Please try again later.';
                }

                this.errorMessage = errorMessage;

                // Show error message with SweetAlert2
                Swal.fire({
                    title: 'Import Failed!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    resetFileInput(): void {
        this.selectedFile = null;
        // Reset the file input element
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    filterShops(): void {
        if (this.selectedRegionFilters.length === 0) {
            this.filteredShops = [...this.shops];
        } else {
            this.filteredShops = this.shops.filter(shop => this.selectedRegionFilters.includes(shop.regionId));
        }
    }

    onRegionFilterChange(regionId: number, checked: boolean): void {
        if (checked) {
            if (!this.selectedRegionFilters.includes(regionId)) {
                this.selectedRegionFilters.push(regionId);
            }
        } else {
            this.selectedRegionFilters = this.selectedRegionFilters.filter(id => id !== regionId);
        }
        this.filterShops();
    }

    isRegionSelected(regionId: number): boolean {
        return this.selectedRegionFilters.includes(regionId);
    }

    clearFilters(): void {
        this.selectedRegionFilters = [];
        this.filterShops();
    }

    downloadTemplate(): void {
        const template = 'Name,SAPId,PhoneNumber,Address,RegionName\nExample Shop,SAP001,1234567890,123 Main St,North Region';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shops_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
    }

    // Custom dropdown methods
    toggleRegionDropdown(): void {
        this.isRegionDropdownOpen = !this.isRegionDropdownOpen;
    }

    toggleFilterDropdown(): void {
        this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
    }

    selectRegion(regionId: number, regionName: string, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        this.shopForm.patchValue({ regionId: regionId });
        this.isRegionDropdownOpen = false;
    }

    getSelectedRegionText(): string {
        const selectedRegionId = this.shopForm.get('regionId')?.value;
        if (!selectedRegionId) {
            return 'Select a region';
        }
        const selectedRegion = this.regions.find(region => region.id === selectedRegionId);
        return selectedRegion ? selectedRegion.name : 'Select a region';
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Close region dropdown if clicked outside
        if (!target.closest('.custom-select')) {
            this.isRegionDropdownOpen = false;
        }

        // Close filter dropdown if clicked outside
        if (!target.closest('.multi-select-dropdown')) {
            this.isFilterDropdownOpen = false;
        }
    }

    onPhoneNumberInput(event: any): void {
        const input = event.target;
        let value = input.value;

        // Remove any non-digit characters
        value = value.replace(/\D/g, '');

        // Limit to 10 digits
        if (value.length > 10) {
            value = value.substring(0, 10);
        }

        // Update the input value
        input.value = value;

        // Update the form control
        this.shopForm.patchValue({ phoneNumber: value });
    }

    getFilterDisplayText(): string {
        if (this.selectedRegionFilters.length === 0) {
            return 'All Regions';
        } else if (this.selectedRegionFilters.length === 1) {
            const regionId = this.selectedRegionFilters[0];
            const region = this.regions.find(r => r.id === regionId);
            return region?.name || 'Unknown Region';
        } else {
            return `${this.selectedRegionFilters.length} regions selected`;
        }
    }

    getRegionBadgeColor(regionName: string): { bg: string; text: string; border: string } {
        // Handle case where region is "-" (no region assigned)
        if (regionName === '-') {
            return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }; // Gray for no region
        }

        // Generate a consistent color based on the region name
        const colors = [
            { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }, // Blue
            { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }, // Yellow
            { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // Green
            { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' }, // Pink
            { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' }, // Purple
            { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' }, // Orange
            { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' }, // Emerald
            { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' }, // Red
            { bg: '#f0f9ff', text: '#0c4a6e', border: '#7dd3fc' }, // Sky
            { bg: '#fdf4ff', text: '#a21caf', border: '#e879f9' }  // Fuchsia
        ];

        // Use the region name to generate a consistent index
        let hash = 0;
        for (let i = 0; i < regionName.length; i++) {
            hash = ((hash << 5) - hash) + regionName.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }
} 
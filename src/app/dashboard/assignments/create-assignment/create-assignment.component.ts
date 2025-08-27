import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssignmentService, AssignmentCreateRequest } from '../../../services/assignment.service';
import { VendorService, Vendor } from '../../../services/vendor.service';
import { WorkflowService, WorkflowResponse } from '../../../services/workflow.service';
import { StoresService, StoreWithAssignmentHistory } from '../../../services/stores.service';
import { RegionService, Region } from '../../../services/region.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-create-assignment',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './create-assignment.component.html',
    styleUrl: './create-assignment.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateAssignmentComponent implements OnInit, OnDestroy {
    assignmentForm: FormGroup;
    filterForm: FormGroup;

    // Data arrays
    vendors: Vendor[] = [];
    workflows: WorkflowResponse[] = [];
    stores: StoreWithAssignmentHistory[] = [];
    regions: Region[] = [];

    // Store selection properties
    selectedRegion: number | null = null;
    cityFilter: string = '';
    currentPage: number = 1;
    pageSize: number = 50;
    totalStores: number = 0;
    selectedStoreIds: number[] = [];
    selectAllPages: boolean = false;
    selectCurrentPage: boolean = false;

    // Filtered and paginated data
    filteredStores: StoreWithAssignmentHistory[] = [];
    currentPageStores: StoreWithAssignmentHistory[] = [];

    // Loading states
    loading = false;
    submitting = false;

    // Filter states
    showStoresOver90Days = false;

    // Custom dropdown states
    vendorDropdownOpen = false;
    workflowDropdownOpen = false;
    regionDropdownOpen = false;

    // Selected values for display
    selectedVendor: string = '';
    selectedVendorId: number | null = null;
    selectedWorkflow: string = '';
    selectedWorkflowId: number | null = null;
    selectedRegionName: string = '';

    private destroy$ = new Subject<void>();

    constructor(
        private assignmentService: AssignmentService,
        private vendorService: VendorService,
        private workflowService: WorkflowService,
        private storesService: StoresService,
        private regionService: RegionService,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.assignmentForm = this.fb.group({
            name: ['', [Validators.required]],
            description: [''],
            vendorId: ['', [Validators.required]],
            workflowDefinitionId: ['', [Validators.required]]
        });

        this.filterForm = this.fb.group({
            selectedRegion: [null],
            cityFilter: ['']
        });
    }

    ngOnInit(): void {
        this.loading = true;
        this.loadDataSequentially();

        // Subscribe to filter changes
        this.filterForm.valueChanges.subscribe(() => {
            this.applyFilters();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        // Close dropdowns when clicking outside
        const target = event.target as HTMLElement;
        if (!target.closest('.custom-select')) {
            this.vendorDropdownOpen = false;
            this.workflowDropdownOpen = false;
            this.regionDropdownOpen = false;
        }
    }

    // =============================================
    // DROPDOWN METHODS
    // =============================================

    toggleVendorDropdown(): void {
        this.vendorDropdownOpen = !this.vendorDropdownOpen;
        this.workflowDropdownOpen = false;
        this.regionDropdownOpen = false;
    }

    toggleWorkflowDropdown(): void {
        this.workflowDropdownOpen = !this.workflowDropdownOpen;
        this.vendorDropdownOpen = false;
        this.regionDropdownOpen = false;
    }

    toggleRegionDropdown(): void {
        this.regionDropdownOpen = !this.regionDropdownOpen;
        this.vendorDropdownOpen = false;
        this.workflowDropdownOpen = false;
    }

    selectVendor(vendor: Vendor): void {
        this.selectedVendor = (vendor.firstName && vendor.lastName) ?
            (vendor.firstName + ' ' + vendor.lastName) : vendor.email;
        this.selectedVendorId = vendor.id;
        this.assignmentForm.patchValue({ vendorId: vendor.id });
        this.vendorDropdownOpen = false;
    }

    selectWorkflow(workflow: WorkflowResponse): void {
        this.selectedWorkflow = `${workflow.name} (${workflow.stageCount} stages)`;
        this.selectedWorkflowId = workflow.id;
        this.assignmentForm.patchValue({ workflowDefinitionId: workflow.id });
        this.workflowDropdownOpen = false;
    }

    selectRegion(region: Region | null): void {
        if (region) {
            this.selectedRegionName = region.name;
            this.selectedRegion = region.id;
            this.filterForm.patchValue({ selectedRegion: region.id });
        } else {
            this.selectedRegionName = '';
            this.selectedRegion = null;
            this.filterForm.patchValue({ selectedRegion: null });
        }
        this.regionDropdownOpen = false;
        this.applyFilters();
    }

    // =============================================
    // DATA LOADING METHODS
    // =============================================

    loadDataSequentially(): void {
        // Load vendors first
        this.vendorService.getVendors().subscribe({
            next: (vendors) => {
                // console.log('Vendors loaded successfully:', vendors);
                this.vendors = vendors;

                // Then load workflows
                this.workflowService.getWorkflows().subscribe({
                    next: (workflows) => {
                        // console.log('Workflows loaded successfully:', workflows);
                        this.workflows = workflows;

                        // Then load regions
                        this.regionService.getRegions().subscribe({
                            next: (regions) => {
                                // console.log('Regions loaded successfully:', regions);
                                this.regions = regions;

                                // Finally load stores
                                this.storesService.getStoresForAssignmentCreation().subscribe({
                                    next: (stores) => {
                                        // console.log('Stores loaded successfully:', stores);
                                        this.stores = stores;
                                        this.filteredStores = stores;
                                        this.updatePagination();
                                        this.updateSelectionCheckboxes();
                                        this.loading = false;
                                    },
                                    error: (error) => {
                                        console.error('Error loading stores:', error);
                                        this.loading = false;
                                        Swal.fire('Error', 'Failed to load stores. Please try again.', 'error');
                                    }
                                });
                            },
                            error: (error) => {
                                console.error('Error loading regions:', error);
                                this.loading = false;
                                Swal.fire('Error', 'Failed to load regions. Please try again.', 'error');
                            }
                        });
                    },
                    error: (error) => {
                        console.error('Error loading workflows:', error);
                        this.loading = false;
                        Swal.fire('Error', 'Failed to load workflows. Please try again.', 'error');
                    }
                });
            },
            error: (error) => {
                console.error('Error loading vendors:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load vendors. Please try again.', 'error');
            }
        });
    }

    loadVendors(): void {
        this.loading = true;
        console.log('Loading vendors...');
        this.vendorService.getVendors().subscribe({
            next: (vendors) => {
                // console.log('Vendors loaded successfully:', vendors);
                this.vendors = vendors;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading vendors:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load vendors. Please try again.', 'error');
            }
        });
    }

    loadWorkflows(): void {
        this.loading = true;
        console.log('Loading workflows...');
        this.workflowService.getWorkflows().subscribe({
            next: (workflows) => {
                // console.log('Workflows loaded successfully:', workflows);
                this.workflows = workflows;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading workflows:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load workflows. Please try again.', 'error');
            }
        });
    }

    loadStores(): void {
        this.loading = true;
        console.log('Loading stores...');
        this.storesService.getStoresForAssignmentCreation().subscribe({
            next: (stores) => {
                // console.log('Stores loaded successfully:', stores);
                this.stores = stores;
                this.filteredStores = stores;
                this.updatePagination();
                this.updateSelectionCheckboxes(); // Update checkbox states after loading
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading stores:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load stores. Please try again.', 'error');
            }
        });
    }

    loadRegions(): void {
        this.loading = true;
        console.log('Loading regions...');
        this.regionService.getRegions().subscribe({
            next: (regions) => {
                console.log('Regions loaded successfully:', regions);
                console.log('Regions count:', regions.length);
                this.regions = regions;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading regions:', error);
                this.loading = false;
                Swal.fire('Error', 'Failed to load regions. Please try again.', 'error');
            }
        });
    }

    // =============================================
    // FILTER AND PAGINATION METHODS
    // =============================================

    applyFilters(): void {
        this.currentPage = 1; // Reset to first page when filtering
        this.filterStores();
        this.updatePagination();
    }

    filterStores(): void {
        const filterValues = this.filterForm.value;
        this.selectedRegion = filterValues.selectedRegion;
        this.cityFilter = filterValues.cityFilter;

        console.log('Filtering stores with:', {
            selectedRegion: this.selectedRegion,
            cityFilter: this.cityFilter,
            totalStores: this.stores.length
        });

        this.filteredStores = this.stores.filter(store => {
            const regionMatch = !this.selectedRegion || store.regionId === this.selectedRegion;
            const cityMatch = !this.cityFilter ||
                store.address?.toLowerCase().includes(this.cityFilter.toLowerCase());
            return regionMatch && cityMatch;
        });

        // Apply 90+ days filter if enabled
        if (this.showStoresOver90Days) {
            this.filteredStores = this.filteredStores.filter(store => {
                if (!store.lastAssignmentDate) {
                    return true; // Include stores with no assignment history
                }
                const lastAssignmentDate = new Date(store.lastAssignmentDate);
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                return lastAssignmentDate < ninetyDaysAgo;
            });
        }

        this.totalStores = this.filteredStores.length;
        console.log('Stores filtered:', {
            totalStores: this.totalStores,
            filteredStores: this.filteredStores.length,
            currentPageStores: this.currentPageStores.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            showStoresOver90Days: this.showStoresOver90Days
        });
        this.updateSelectionCheckboxes(); // Update checkbox states after filtering
    }

    toggleStoresOver90DaysFilter(): void {
        this.showStoresOver90Days = !this.showStoresOver90Days;
        this.currentPage = 1; // Reset to first page when filtering
        this.filterStores();
        this.updatePagination();
    }

    updatePagination(): void {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.currentPageStores = this.filteredStores.slice(startIndex, endIndex);
        // console.log('Pagination updated:', {
        //     totalStores: this.totalStores,
        //     filteredStores: this.filteredStores.length,
        //     currentPageStores: this.currentPageStores.length,
        //     currentPage: this.currentPage,
        //     pageSize: this.pageSize
        // });
        this.updateSelectionCheckboxes(); // Update checkbox states after pagination
    }

    get totalPages(): number {
        return Math.ceil(this.totalStores / this.pageSize);
    }

    get startIndex(): number {
        return (this.currentPage - 1) * this.pageSize;
    }

    get endIndex(): number {
        return Math.min(this.startIndex + this.pageSize, this.totalStores);
    }

    get storesOver90DaysCount(): number {
        return this.stores.filter(store => {
            if (!store.lastAssignmentDate) {
                return true; // Include stores with no assignment history
            }
            const lastAssignmentDate = new Date(store.lastAssignmentDate);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            return lastAssignmentDate < ninetyDaysAgo;
        }).length;
    }

    // =============================================
    // STORE SELECTION METHODS
    // =============================================

    selectAllStores(): void {
        console.log('selectAllStores called, selectAllPages:', this.selectAllPages);
        // Toggle the selectAllPages state
        this.selectAllPages = !this.selectAllPages;

        if (this.selectAllPages) {
            // Select all filtered stores
            this.selectedStoreIds = this.filteredStores.map(store => store.id);
            console.log('Selected all stores:', this.selectedStoreIds);
        } else {
            // Deselect all stores
            this.selectedStoreIds = [];
            console.log('Deselected all stores');
        }
        this.selectCurrentPage = false;
        this.updateSelectionCheckboxes();
    }

    selectCurrentPageStores(): void {
        console.log('selectCurrentPageStores called, selectCurrentPage:', this.selectCurrentPage);
        // Toggle the selectCurrentPage state
        this.selectCurrentPage = !this.selectCurrentPage;

        if (this.selectCurrentPage) {
            // Add current page stores to selection
            const currentPageIds = this.currentPageStores.map(store => store.id);
            this.selectedStoreIds = [...new Set([...this.selectedStoreIds, ...currentPageIds])];
            console.log('Added current page stores to selection:', currentPageIds);
        } else {
            // Remove current page stores from selection
            const currentPageIds = this.currentPageStores.map(store => store.id);
            this.selectedStoreIds = this.selectedStoreIds.filter(id => !currentPageIds.includes(id));
            console.log('Removed current page stores from selection:', currentPageIds);
        }
        this.selectAllPages = false;
        this.updateSelectionCheckboxes();
    }

    toggleStoreSelection(storeId: number): void {
        const index = this.selectedStoreIds.indexOf(storeId);
        if (index > -1) {
            this.selectedStoreIds.splice(index, 1);
        } else {
            this.selectedStoreIds.push(storeId);
        }

        // Update selection checkboxes
        this.updateSelectionCheckboxes();
    }

    updateSelectionCheckboxes(): void {
        // Update "Select All Pages" checkbox
        this.selectAllPages = this.selectedStoreIds.length === this.filteredStores.length && this.filteredStores.length > 0;

        // Update "Select Current Page" checkbox
        const currentPageIds = this.currentPageStores.map(store => store.id);
        this.selectCurrentPage = currentPageIds.length > 0 && currentPageIds.every(id => this.selectedStoreIds.includes(id));

        // console.log('updateSelectionCheckboxes:', {
        //     selectedStoreIds: this.selectedStoreIds.length,
        //     filteredStores: this.filteredStores.length,
        //     currentPageStores: this.currentPageStores.length,
        //     selectAllPages: this.selectAllPages,
        //     selectCurrentPage: this.selectCurrentPage
        // });
    }

    isStoreSelected(storeId: number): boolean {
        return this.selectedStoreIds.includes(storeId);
    }



    // =============================================
    // PAGINATION METHODS
    // =============================================

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
        }
    }

    // =============================================
    // FORM SUBMISSION
    // =============================================

    onSubmit() {
        if (this.assignmentForm.valid && this.selectedStoreIds.length > 0) {
            // Check if any selected stores have recent assignments (less than 30 days)
            const storesWithRecentAssignments = this.checkStoresWithRecentAssignments();

            if (storesWithRecentAssignments.length > 0) {
                this.showRecentAssignmentWarning(storesWithRecentAssignments);
            } else {
                this.createAssignment();
            }
        }
    }

    private checkStoresWithRecentAssignments(): StoreWithAssignmentHistory[] {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        return this.currentPageStores.filter(store =>
            this.selectedStoreIds.includes(store.id) &&
            store.lastAssignmentDate &&
            new Date(store.lastAssignmentDate) > threeMonthsAgo
        );
    }

    private showRecentAssignmentWarning(storesWithRecentAssignments: StoreWithAssignmentHistory[]) {
        let message: string;
        let title: string;

        if (storesWithRecentAssignments.length === 1) {
            const store = storesWithRecentAssignments[0];
            title = 'Recent Assignment Warning';
            message = `Store "${store.name}" has a last assignment date less than 3 months ago. Do you still want to proceed with creating this assignment?`;
        } else {
            title = 'Recent Assignments Warning';
            message = `${storesWithRecentAssignments.length} selected stores have last assignment dates less than 3 months ago. Do you still want to proceed with creating this assignment?`;
        }

        Swal.fire({
            title: title,
            html: message,
            // icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#006fcf',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Proceed',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-html',
                confirmButton: 'custom-swal-confirm-btn',
                cancelButton: 'custom-swal-cancel-btn'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.createAssignment();
            }
        });
    }

    private createAssignment() {
        this.submitting = true;
        const request: AssignmentCreateRequest = {
            name: this.assignmentForm.value.name,
            description: this.assignmentForm.value.description,
            vendorId: this.assignmentForm.value.vendorId,
            workflowDefinitionId: this.assignmentForm.value.workflowDefinitionId,
            storeIds: this.selectedStoreIds
        };

        this.assignmentService.createAssignment(request).subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    title: 'Success!',
                    text: 'Assignment created successfully',
                    icon: 'success',
                    confirmButtonColor: '#006fcf'
                }).then(() => {
                    this.router.navigate(['/assignments']);
                });
            },
            error: (error) => {
                this.submitting = false;
                console.error('Error creating assignment:', error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to create assignment. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#006fcf'
                });
            }
        });
    }

    cancel(): void {
        if (this.selectedStoreIds.length > 0 || this.assignmentForm.dirty) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'You have unsaved changes. Do you want to leave without saving?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#006fcf',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, leave',
                cancelButtonText: 'Stay'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.router.navigate(['/assignments']);
                }
            });
        } else {
            this.router.navigate(['/assignments']);
        }
    }
} 
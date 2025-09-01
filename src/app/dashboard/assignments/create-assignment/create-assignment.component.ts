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
    selectedRegionFilters: number[] = [];
    selectedStateFilters: number[] = [];
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

    // Sorting properties
    currentSortField: string = 'name';
    currentSortDirection: 'asc' | 'desc' = 'asc';

    // Filter states
    // showStoresOver90Days = false; // Replaced with customizable days filter

    // Custom dropdown states
    vendorDropdownOpen = false;
    workflowDropdownOpen = false;
    isFilterDropdownOpen = false;
    stateDropdownOpen = false;

    // Selected values for display
    selectedVendor: string = '';
    selectedVendorId: number | null = null;
    selectedWorkflow: string = '';
    selectedWorkflowId: number | null = null;

    // Available states for filtering
    availableStates: { id: number; name: string }[] = [];

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
            daysFilter: [null]
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
        if (!target.closest('.custom-select') && !target.closest('.multi-select-dropdown')) {
            this.vendorDropdownOpen = false;
            this.workflowDropdownOpen = false;
            this.isFilterDropdownOpen = false;
            this.stateDropdownOpen = false;
        }
    }

    // =============================================
    // DROPDOWN METHODS
    // =============================================

    toggleVendorDropdown(): void {
        this.vendorDropdownOpen = !this.vendorDropdownOpen;
        this.workflowDropdownOpen = false;
        this.isFilterDropdownOpen = false;
    }

    toggleWorkflowDropdown(): void {
        this.workflowDropdownOpen = !this.workflowDropdownOpen;
        this.vendorDropdownOpen = false;
        this.isFilterDropdownOpen = false;
    }



    toggleFilterDropdown(): void {
        this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
        this.vendorDropdownOpen = false;
        this.workflowDropdownOpen = false;
        this.stateDropdownOpen = false;
    }

    toggleStateDropdown(): void {
        this.stateDropdownOpen = !this.stateDropdownOpen;
        this.vendorDropdownOpen = false;
        this.workflowDropdownOpen = false;
        this.isFilterDropdownOpen = false;
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

    onRegionFilterChange(regionId: number, checked: boolean): void {
        if (checked) {
            if (!this.selectedRegionFilters.includes(regionId)) {
                this.selectedRegionFilters.push(regionId);
            }
        } else {
            this.selectedRegionFilters = this.selectedRegionFilters.filter(id => id !== regionId);
        }
        this.applyFilters();
    }

    onStateFilterChange(stateId: number, checked: boolean): void {
        if (checked) {
            if (!this.selectedStateFilters.includes(stateId)) {
                this.selectedStateFilters.push(stateId);
            }
        } else {
            this.selectedStateFilters = this.selectedStateFilters.filter(id => id !== stateId);
        }
        this.applyFilters();
    }

    isRegionSelected(regionId: number): boolean {
        return this.selectedRegionFilters.includes(regionId);
    }

    isStateSelected(stateId: number): boolean {
        return this.selectedStateFilters.includes(stateId);
    }

    getFilterDisplayText(): string {
        if (this.selectedRegionFilters.length === 0) {
            return 'All Regions';
        } else if (this.selectedRegionFilters.length === 1) {
            const region = this.regions.find(r => r.id === this.selectedRegionFilters[0]);
            return region ? region.name : '1 Region Selected';
        } else {
            return `${this.selectedRegionFilters.length} Regions Selected`;
        }
    }

    getStateFilterDisplayText(): string {
        if (this.selectedStateFilters.length === 0) {
            return 'All States';
        } else if (this.selectedStateFilters.length === 1) {
            const state = this.availableStates.find(s => s.id === this.selectedStateFilters[0]);
            return state ? state.name : '1 State Selected';
        } else {
            return `${this.selectedStateFilters.length} States Selected`;
        }
    }

    clearFilters(): void {
        this.selectedRegionFilters = [];
        this.selectedStateFilters = [];
        this.applyFilters();
    }

    clearStateFilters(): void {
        this.selectedStateFilters = [];
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
                        // Filter out 'Vendor Workflow' from the dropdown options
                        // NOTE: Vendor Workflow should not be selectable for brand users creating assignments
                        // as it's specifically designed for vendor app workflow management
                        this.workflows = workflows.filter(workflow => workflow.name !== 'Vendor Workflow');

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
                                        this.extractUniqueStates(); // Extract unique states from loaded stores

                                        // Apply initial sort by Store Name in ascending order
                                        this.sortStores();

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
                this.extractUniqueStates(); // Extract unique states from loaded stores
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

        console.log('Filtering stores with:', {
            selectedRegionFilters: this.selectedRegionFilters,
            selectedStateFilters: this.selectedStateFilters,
            totalStores: this.stores.length
        });

        this.filteredStores = this.stores.filter(store => {
            const regionMatch = this.selectedRegionFilters.length === 0 || this.selectedRegionFilters.includes(store.regionId);
            const stateMatch = this.selectedStateFilters.length === 0 || this.selectedStateFilters.includes(this.getStateIdByName(store.stateName));
            return regionMatch && stateMatch;
        });

        // Apply customizable days filter if specified
        const daysFilter = filterValues.daysFilter;
        if (daysFilter && daysFilter > 0) {
            this.filteredStores = this.filteredStores.filter(store => {
                if (!store.lastAssignmentDate) {
                    return true; // Include stores with no assignment history
                }
                const lastAssignmentDate = new Date(store.lastAssignmentDate);
                const specifiedDaysAgo = new Date();
                specifiedDaysAgo.setDate(specifiedDaysAgo.getDate() - daysFilter);
                return lastAssignmentDate < specifiedDaysAgo;
            });
        }

        this.totalStores = this.filteredStores.length;

        // Apply sorting if a sort field is selected
        if (this.currentSortField) {
            this.sortStores();
        }

        console.log('Stores filtered:', {
            totalStores: this.totalStores,
            filteredStores: this.filteredStores.length,
            currentPageStores: this.currentPageStores.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            daysFilter: filterValues.daysFilter,
            sortField: this.currentSortField,
            sortDirection: this.currentSortDirection
        });
        this.updateSelectionCheckboxes(); // Update checkbox states after filtering
    }

    // toggleStoresOver90DaysFilter method removed - replaced with customizable days filter

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

    // storesOver90DaysCount getter removed - replaced with customizable days filter logic

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
    // SORTING METHODS
    // =============================================

    sortBy(field: string): void {
        if (this.currentSortField === field) {
            // Toggle direction if same field
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New field, start with ascending
            this.currentSortField = field;
            this.currentSortDirection = 'asc';
        }

        this.sortStores();
        this.updatePagination();
    }

    sortStores(): void {
        if (!this.currentSortField) return;

        this.filteredStores.sort((a: any, b: any) => {
            let aValue = a[this.currentSortField];
            let bValue = b[this.currentSortField];

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            // Handle date sorting
            if (this.currentSortField === 'lastAssignmentDate') {
                if (!aValue) aValue = new Date(0);
                if (!bValue) bValue = new Date(0);
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            // Convert to strings for comparison
            aValue = aValue.toString().toLowerCase();
            bValue = bValue.toString().toLowerCase();

            if (this.currentSortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }

    getSortIcon(field: string): string {
        if (this.currentSortField !== field) return '';
        return this.currentSortDirection === 'asc' ? '↑' : '↓';
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

    private getStateNameById(stateId: number): string {
        const state = this.availableStates.find(s => s.id === stateId);
        return state ? state.name : '';
    }

    private extractUniqueStates(): void {
        const stateMap = new Map<number, string>();
        this.stores.forEach(store => {
            if (store.stateName && store.stateName !== '-') {
                stateMap.set(this.getStateIdByName(store.stateName), store.stateName);
            }
        });
        this.availableStates = Array.from(stateMap.entries()).map(([id, name]) => ({ id, name }));
    }

    private getStateIdByName(stateName: string): number {
        // This is a simple implementation - in a real app, you might want to maintain a states list
        // For now, we'll use a hash of the state name as an ID
        return stateName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
} 
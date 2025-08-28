import { Component, OnInit, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './reports.component.html',
    styleUrl: './reports.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReportsComponent implements OnInit {
    // Filter properties
    selectedAssignments: any[] = [];
    startDate: string = '';
    endDate: string = '';
    selectedStatuses: string[] = [];

    // Filter state
    filtersApplied: boolean = false;

    // Dropdown states
    isAssignmentDropdownOpen: boolean = false;
    isStatusDropdownOpen: boolean = false;
    isDatePickerOpen: boolean = false;
    isExportDropdownOpen: boolean = false;

    // Date picker properties
    currentMonth: Date = new Date();
    weekdays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    calendarDays: any[] = [];
    tempStartDate: string = '';
    tempEndDate: string = '';

    // Data for dropdowns
    assignments: any[] = [];
    statuses: string[] = ['Completed', 'In Progress'];

    // Grid data
    stores: any[] = [];
    totalCount: number = 0;
    currentPage: number = 1;
    pageSize: number = 5; // Changed to 5 stores per page
    totalPages: number = 0;
    loading: boolean = false;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadDropdownData();
    }

    // Host listener to close dropdowns when clicking outside
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Check if click is outside assignment dropdown
        if (!target.closest('.custom-select') || !target.closest('.assignment-dropdown')) {
            this.isAssignmentDropdownOpen = false;
        }

        // Check if click is outside status dropdown
        if (!target.closest('.custom-select') || !target.closest('.status-dropdown')) {
            this.isStatusDropdownOpen = false;
        }

        // Check if click is outside date picker
        if (!target.closest('.date-range-picker')) {
            this.isDatePickerOpen = false;
        }

        // Check if click is outside export dropdown
        if (!target.closest('.export-dropdown')) {
            this.isExportDropdownOpen = false;
        }
    }

    async loadDropdownData(): Promise<void> {
        try {
            // TODO: Get tenantId from auth service
            const tenantId = 1; // Temporary hardcoded value

            // Load both assignments and statuses in one call
            const response = await this.http.get<any>(`${environment.apiUrl}/report/dropdown-data?tenantId=${tenantId}`).toPromise();

            if (response) {
                this.assignments = response.assignments || [];
                this.statuses = (response.statuses && response.statuses.map((s: any) => s.status)) || ['Completed', 'In Progress'];
            }
        } catch (error) {
            console.error('Error loading dropdown data:', error);
            // Fallback to sample data if API fails
            this.assignments = [
                { id: 1, name: 'Store Setup Assignment' },
                { id: 2, name: 'Product Display Assignment' },
                { id: 3, name: 'Promotional Material Assignment' }
            ];
        }
    }

    async applyFilters(): Promise<void> {
        if (this.selectedAssignments.length === 0 && this.selectedStatuses.length === 0 && !this.startDate && !this.endDate) {
            alert('Please select at least one filter criteria');
            return;
        }

        this.loading = true;

        try {
            // TODO: Get tenantId from auth service
            const tenantId = 1; // Temporary hardcoded value

            const params = new URLSearchParams();
            params.append('tenantId', tenantId.toString());
            params.append('pageNumber', this.currentPage.toString());
            params.append('pageSize', this.pageSize.toString());

            if (this.selectedAssignments.length > 0) {
                const assignmentIds = this.selectedAssignments.map(a => a.id).join(',');
                params.append('assignmentIds', assignmentIds);
            }

            if (this.selectedStatuses.length > 0) {
                const statusList = this.selectedStatuses.join(',');
                params.append('statuses', statusList);
            }

            if (this.startDate) {
                params.append('startDate', this.startDate);
            }

            if (this.endDate) {
                params.append('endDate', this.endDate);
            }

            const response = await this.http.get<any>(`${environment.apiUrl}/report/filtered-stores?${params.toString()}`).toPromise();

            if (response) {
                this.stores = response.stores || [];
                this.totalCount = response.totalCount || 0;
                // Calculate total pages based on total count and page size
                this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                this.filtersApplied = true;

                // Debug logging
                console.log('Pagination Debug:', {
                    totalCount: this.totalCount,
                    pageSize: this.pageSize,
                    totalPages: this.totalPages,
                    currentPage: this.currentPage,
                    filtersApplied: this.filtersApplied,
                    storesCount: this.stores.length
                });
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            alert('Error applying filters. Please try again.');
        } finally {
            this.loading = false;
        }
    }

    async changePage(page: number): Promise<void> {
        if (page < 1 || page > this.totalPages) return;

        this.currentPage = page;
        await this.applyFilters();
    }

    clearFilters(): void {
        this.selectedAssignments = [];
        this.startDate = '';
        this.endDate = '';
        this.selectedStatuses = [];
        this.filtersApplied = false;
        this.stores = [];
        this.totalCount = 0;
        this.currentPage = 1;
        this.totalPages = 0;
    }

    // Filter methods
    toggleAssignmentDropdown(event: Event): void {
        event.stopPropagation();
        this.isAssignmentDropdownOpen = !this.isAssignmentDropdownOpen;
        this.isStatusDropdownOpen = false;
    }

    toggleStatusDropdown(event: Event): void {
        event.stopPropagation();
        this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
        this.isAssignmentDropdownOpen = false;
    }

    toggleAssignmentSelection(assignment: any, event: Event): void {
        event.stopPropagation();
        const index = this.selectedAssignments.findIndex(a => a.id === assignment.id);
        if (index > -1) {
            this.selectedAssignments.splice(index, 1);
        } else {
            this.selectedAssignments.push(assignment);
        }
    }

    toggleStatusSelection(status: string, event: Event): void {
        event.stopPropagation();
        const index = this.selectedStatuses.indexOf(status);
        if (index > -1) {
            this.selectedStatuses.splice(index, 1);
        } else {
            this.selectedStatuses.push(status);
        }
    }

    isAssignmentSelected(assignment: any): boolean {
        return this.selectedAssignments.some(a => a.id === assignment.id);
    }

    isStatusSelected(status: string): boolean {
        return this.selectedStatuses.includes(status);
    }

    getSelectedAssignmentsText(): string {
        if (this.selectedAssignments.length === 0) return 'Select Assignments';
        if (this.selectedAssignments.length === 1) return this.selectedAssignments[0].name;
        return `${this.selectedAssignments.length} Assignments Selected`;
    }

    getSelectedStatusesText(): string {
        if (this.selectedStatuses.length === 0) return 'Select Statuses';
        if (this.selectedStatuses.length === 1) return this.selectedStatuses[0];
        return `${this.selectedStatuses.length} Statuses Selected`;
    }

    // Search button always applies filters
    search(): void {
        this.currentPage = 1; // Reset to first page when searching
        this.applyFilters();
    }

    // Clear filters button
    clearSearch(): void {
        this.clearFilters();
    }

    // Date Picker Methods
    toggleDatePicker(): void {
        this.isDatePickerOpen = !this.isDatePickerOpen;
        if (this.isDatePickerOpen) {
            this.generateCalendar();
            this.tempStartDate = this.startDate;
            this.tempEndDate = this.endDate;
        }
        // Close other dropdowns
        this.isAssignmentDropdownOpen = false;
        this.isStatusDropdownOpen = false;
        this.isExportDropdownOpen = false;
    }

    generateCalendar(): void {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        this.calendarDays = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            this.calendarDays.push({
                date: new Date(currentDate),
                dayNumber: currentDate.getDate(),
                currentMonth: currentDate.getMonth() === month
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    previousMonth(): void {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.generateCalendar();
    }

    nextMonth(): void {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.generateCalendar();
    }

    selectDate(date: Date): void {
        const dateStr = this.formatDate(date);

        if (!this.tempStartDate || (this.tempStartDate && this.tempEndDate)) {
            // Start new range
            this.tempStartDate = dateStr;
            this.tempEndDate = '';
        } else {
            // Complete range
            if (new Date(dateStr) < new Date(this.tempStartDate)) {
                this.tempEndDate = this.tempStartDate;
                this.tempStartDate = dateStr;
            } else {
                this.tempEndDate = dateStr;
            }
        }
    }

    isDateSelected(date: Date): boolean {
        const dateStr = this.formatDate(date);
        return dateStr === this.tempStartDate || dateStr === this.tempEndDate;
    }

    isDateInRange(date: Date): boolean {
        if (!this.tempStartDate || !this.tempEndDate) return false;
        const dateStr = this.formatDate(date);
        const start = new Date(this.tempStartDate);
        const end = new Date(this.tempEndDate);
        const current = new Date(dateStr);
        return current >= start && current <= end;
    }

    isRangeStart(date: Date): boolean {
        return this.formatDate(date) === this.tempStartDate;
    }

    isRangeEnd(date: Date): boolean {
        return this.formatDate(date) === this.tempEndDate;
    }

    clearDateRange(): void {
        this.tempStartDate = '';
        this.tempEndDate = '';
    }

    applyDateRange(): void {
        this.startDate = this.tempStartDate;
        this.endDate = this.tempEndDate;
        this.isDatePickerOpen = false;
    }

    getDateRangeText(): string {
        if (!this.startDate && !this.endDate) {
            return 'Select Date Range';
        }
        if (this.startDate && this.endDate) {
            return `${this.startDate} - ${this.endDate}`;
        }
        return this.startDate || this.endDate;
    }

    getCurrentMonthYear(): string {
        return this.currentMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }

    formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    // Export Methods
    toggleExportDropdown(event: Event): void {
        event.stopPropagation();
        this.isExportDropdownOpen = !this.isExportDropdownOpen;
        // Close other dropdowns
        this.isAssignmentDropdownOpen = false;
        this.isStatusDropdownOpen = false;
        this.isDatePickerOpen = false;
    }

    exportToPDF(): void {
        console.log('Export to PDF clicked');
        this.isExportDropdownOpen = false;
        // TODO: Implement PDF export functionality
    }

    exportToExcel(): void {
        console.log('Export to Excel clicked');
        this.isExportDropdownOpen = false;
        // TODO: Implement Excel export functionality
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Completed':
                return 'status-completed';
            case 'In Progress':
                return 'status-in-progress';
            default:
                return 'status-default';
        }
    }
}

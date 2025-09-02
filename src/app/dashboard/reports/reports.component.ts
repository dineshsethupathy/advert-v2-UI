import { Component, OnInit, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import { ReportService, StoreFrontendPdfData } from '../../services/report.service';
import { TrimPipe } from './trim.pipe';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, TrimPipe],
    templateUrl: './reports.component.html',
    styleUrl: './reports.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReportsComponent implements OnInit {
    // Filter properties
    selectedAssignments: any[] = [];
    startDate: string = '';
    endDate: string = '';
    selectedVendorStatuses: string[] = [];
    selectedApprovalStatuses: string[] = [];

    // Filter state
    filtersApplied: boolean = false;

    // Dropdown states
    isAssignmentDropdownOpen: boolean = false;
    isVendorStatusDropdownOpen: boolean = false;
    isApprovalStatusDropdownOpen: boolean = false;
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
    vendorStatuses: string[] = ['Not Started', 'In Progress', 'Completed'];
    approvalStatuses: string[] = ['Pending', 'Approved', 'Rejected', 'Completed'];

    // Grid data
    stores: any[] = [];
    totalCount: number = 0;
    currentPage: number = 1;
    pageSize: number = 10; // Changed to 10 stores per page
    totalPages: number = 0;
    loading: boolean = false;

    // Export properties
    exporting: boolean = false;
    exportingPdf: boolean = false;

    constructor(private http: HttpClient, private reportService: ReportService) { }

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

        // Check if click is outside vendor status dropdown
        if (!target.closest('.custom-select') || !target.closest('.vendor-status-dropdown')) {
            this.isVendorStatusDropdownOpen = false;
        }

        // Check if click is outside approval status dropdown
        if (!target.closest('.custom-select') || !target.closest('.approval-status-dropdown')) {
            this.isApprovalStatusDropdownOpen = false;
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
                this.vendorStatuses = (response.vendorStatuses && response.vendorStatuses.map((s: any) => s.status)) || ['Not Started', 'In Progress', 'Completed'];
                this.approvalStatuses = (response.approvalStatuses && response.approvalStatuses.map((s: any) => s.status)) || ['Pending', 'Approved', 'Rejected', 'Completed'];
            }
        } catch (error) {
            console.error('Error loading dropdown data:', error);
            // dont want a fallback
            // this.assignments = [
            //     { id: 1, name: 'Store Setup Assignment' },
            //     { id: 2, name: 'Product Display Assignment' },
            //     { id: 3, name: 'Promotional Material Assignment' }
            // ];
        }
    }

    async applyFilters(): Promise<void> {
        if (this.selectedAssignments.length === 0 && this.selectedVendorStatuses.length === 0 && this.selectedApprovalStatuses.length === 0 && !this.startDate && !this.endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'No Filters Selected',
                text: 'Please select at least one filter criteria.',
                confirmButtonText: 'OK'
            });
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

            if (this.selectedVendorStatuses.length > 0) {
                const vendorStatusList = this.selectedVendorStatuses.join(',');
                params.append('vendorStatuses', vendorStatusList);
            }

            if (this.selectedApprovalStatuses.length > 0) {
                const approvalStatusList = this.selectedApprovalStatuses.join(',');
                params.append('approvalStatuses', approvalStatusList);
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
                    storesCount: this.stores.length,
                    stores: this.stores
                });
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            Swal.fire({
                icon: 'error',
                title: 'Filter Error',
                text: 'Error applying filters. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            this.loading = false;
        }
    }

    changePage(page: number): void {
        if (page < 1 || page > this.totalPages) return;

        this.currentPage = page;
        this.applyFilters();
    }

    onPageSizeChange(): void {
        // Reset to first page when changing page size
        this.currentPage = 1;
        this.totalPages = 0;
        this.applyFilters();
    }

    clearFilters(): void {
        this.selectedAssignments = [];
        this.startDate = '';
        this.endDate = '';
        this.selectedVendorStatuses = [];
        this.selectedApprovalStatuses = [];
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

    }

    toggleVendorStatusDropdown(event: Event): void {
        event.stopPropagation();
        this.isVendorStatusDropdownOpen = !this.isVendorStatusDropdownOpen;
        this.isAssignmentDropdownOpen = false;
        this.isApprovalStatusDropdownOpen = false;
    }

    toggleApprovalStatusDropdown(event: Event): void {
        event.stopPropagation();
        this.isApprovalStatusDropdownOpen = !this.isApprovalStatusDropdownOpen;
        this.isAssignmentDropdownOpen = false;
        this.isVendorStatusDropdownOpen = false;
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

    toggleVendorStatusSelection(status: string, event: Event): void {
        event.stopPropagation();
        const index = this.selectedVendorStatuses.indexOf(status);
        if (index > -1) {
            this.selectedVendorStatuses.splice(index, 1);
        } else {
            this.selectedVendorStatuses.push(status);
        }
    }

    toggleApprovalStatusSelection(status: string, event: Event): void {
        event.stopPropagation();
        const index = this.selectedApprovalStatuses.indexOf(status);
        if (index > -1) {
            this.selectedApprovalStatuses.splice(index, 1);
        } else {
            this.selectedApprovalStatuses.push(status);
        }
    }

    isAssignmentSelected(assignment: any): boolean {
        return this.selectedAssignments.some(a => a.id === assignment.id);
    }

    isVendorStatusSelected(status: string): boolean {
        return this.selectedVendorStatuses.includes(status);
    }

    isApprovalStatusSelected(status: string): boolean {
        return this.selectedApprovalStatuses.includes(status);
    }

    getSelectedAssignmentsText(): string {
        if (this.selectedAssignments.length === 0) return 'Select Assignments';
        if (this.selectedAssignments.length === 1) return this.selectedAssignments[0].name;
        return `${this.selectedAssignments.length} Assignments Selected`;
    }

    getSelectedVendorStatusesText(): string {
        if (this.selectedVendorStatuses.length === 0) return 'Select Vendor Status';
        if (this.selectedVendorStatuses.length === 1) return this.selectedVendorStatuses[0];
        return `${this.selectedVendorStatuses.length} Vendor Statuses Selected`;
    }

    getSelectedApprovalStatusesText(): string {
        if (this.selectedApprovalStatuses.length === 0) return 'Select Approval Status';
        if (this.selectedApprovalStatuses.length === 1) return this.selectedApprovalStatuses[0];
        return `${this.selectedApprovalStatuses.length} Approval Statuses Selected`;
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

        this.isDatePickerOpen = false;
    }

    exportToPDF(): void {
        console.log('Export to PDF clicked');
        this.isExportDropdownOpen = false;
        // TODO: Implement PDF export functionality
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

    // Helper methods for board calculations
    getBoardHeightFt(heightIn: number): number {
        if (!heightIn) return 0;
        return +(heightIn / 12).toFixed(2);
    }

    getBoardWidthFt(widthIn: number): number {
        if (!widthIn) return 0;
        return +(widthIn / 12).toFixed(2);
    }

    getBoardArea(widthIn: number, heightIn: number): number {
        console.log('widthIn..', widthIn);
        if (!widthIn || !heightIn) return 0;
        const widthFt = widthIn / 12;
        const heightFt = heightIn / 12;
        return +(widthFt * heightFt).toFixed(2);
    }

    getBoardGrossAmount(widthIn: number, heightIn: number, cost: number): number {
        if (!widthIn || !heightIn || !cost) return 0;
        const area = this.getBoardArea(widthIn, heightIn);
        return +(area * cost).toFixed(2);
    }

    getBoardGst(widthIn: number, heightIn: number, cost: number): number {
        if (!widthIn || !heightIn || !cost) return 0;
        const grossAmount = this.getBoardGrossAmount(widthIn, heightIn, cost);
        return +(grossAmount * 0.18).toFixed(2);
    }

    getBoardNetAmount(widthIn: number, heightIn: number, cost: number): number {
        if (!widthIn || !heightIn || !cost) return 0;
        const grossAmount = this.getBoardGrossAmount(widthIn, heightIn, cost);
        const gst = this.getBoardGst(widthIn, heightIn, cost);
        return +(grossAmount + gst).toFixed(2);
    }

    // Helper methods for pole calculations
    getPoleHeightFt(heightIn: number): number {
        if (!heightIn) return 0;
        return +(heightIn / 12).toFixed(2);
    }

    getPoleWidthFt(widthIn: number): number {
        if (!widthIn) return 0;
        return +(widthIn / 12).toFixed(2);
    }

    getPoleArea(widthIn: number, heightIn: number, quantity: number): number {
        if (!widthIn || !heightIn || !quantity) return 0;
        const widthFt = widthIn / 12;
        const heightFt = heightIn / 12;
        const area = widthFt * heightFt;
        return +(area * quantity).toFixed(2);
    }

    getPoleGrossAmount(widthIn: number, heightIn: number, quantity: number, cost: number): number {
        if (!widthIn || !heightIn || !quantity || !cost) return 0;
        const area = this.getPoleArea(widthIn, heightIn, quantity);
        return +(area * cost).toFixed(2);
    }

    getPoleGst(widthIn: number, heightIn: number, quantity: number, cost: number): number {
        if (!widthIn || !heightIn || !quantity || !cost) return 0;
        const grossAmount = this.getPoleGrossAmount(widthIn, heightIn, quantity, cost);
        return +(grossAmount * 0.18).toFixed(2);
    }

    getPoleNetAmount(widthIn: number, heightIn: number, quantity: number, cost: number): number {
        if (!widthIn || !heightIn || !quantity || !cost) return 0;
        const grossAmount = this.getPoleGrossAmount(widthIn, heightIn, quantity, cost);
        const gst = this.getPoleGst(widthIn, heightIn, quantity, cost);
        return +(grossAmount + gst).toFixed(2);
    }

    // GPS helper methods
    getGpsDisplayText(gpsLocation: string): string {
        if (!gpsLocation) return '';
        const gpsParts = gpsLocation.split('|');
        if (gpsParts.length >= 3) {
            return gpsParts[0]; // Show address part
        }
        return gpsLocation;
    }

    getGoogleMapsUrl(gpsLocation: string): string {
        console.log('gpsLocation..', gpsLocation);
        if (!gpsLocation) return '';
        const gpsParts = gpsLocation.split('|');
        if (gpsParts.length >= 3) {
            const lat = gpsParts[1];
            const lng = gpsParts[2];
            return `https://www.google.com/maps?q=${lat},${lng}`;
        }
        return '';
    }

    // Excel Export Methods
    async exportToExcel(): Promise<void> {
        if (this.stores.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data to Export',
                text: 'Please apply filters and search to get data for export.',
                confirmButtonText: 'OK'
            });
            return;
        }

        this.exporting = true;

        try {
            // Get all filtered data for export (not just current page)
            const exportData = await this.getExportData();
            if (exportData && exportData.stores && exportData.stores.length > 0) {
                await this.generateExcelFile(exportData.stores);
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Data Available',
                    text: 'No data available for export with the current filters.',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Error exporting to Excel. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            this.exporting = false;
        }
    }

    private async getExportData(): Promise<any> {
        try {
            // TODO: Get tenantId from auth service
            const tenantId = 1; // Temporary hardcoded value

            const params = new URLSearchParams();
            params.append('tenantId', tenantId.toString());

            if (this.selectedAssignments.length > 0) {
                const assignmentIds = this.selectedAssignments.map(a => a.id).join(',');
                params.append('assignmentIds', assignmentIds);
            }

            if (this.selectedVendorStatuses.length > 0) {
                const vendorStatusList = this.selectedVendorStatuses.join(',');
                params.append('vendorStatuses', vendorStatusList);
            }

            if (this.selectedApprovalStatuses.length > 0) {
                const approvalStatusList = this.selectedApprovalStatuses.join(',');
                params.append('approvalStatuses', approvalStatusList);
            }

            if (this.startDate) {
                params.append('startDate', this.startDate);
            }

            if (this.endDate) {
                params.append('endDate', this.endDate);
            }

            const response = await this.http.get<any>(`${environment.apiUrl}/report/export-data?${params.toString()}`).toPromise();
            return response;
        } catch (error) {
            console.error('Error getting export data:', error);
            throw error;
        }
    }

    private async generateExcelFile(stores: any[]): Promise<void> {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Store Reports');

            // Define columns with the exact structure you specified
            const columns = [
                { header: 'ASSIGNMENT NAME', key: 'assignmentName' },
                { header: 'BDE NAME', key: 'bdeName' },
                { header: 'BDM NAME', key: 'bdmName' },
                { header: 'RETAILER/OUTLET NAME', key: 'storeName' },
                { header: 'LOCATION', key: 'location' },
                { header: 'GPS LOCATION', key: 'gpsLocation' },
                { header: 'MOBILE NUMBER', key: 'mobileNumber' },
                { header: 'BRANDING TYPE', key: 'brandingType' },
                { header: 'HEIGHT(FT)', key: 'heightFt' },
                { header: 'WIDTH(FT)', key: 'widthFt' },
                { header: 'HEIGHT(IN)', key: 'heightIn' },
                { header: 'WIDTH(IN)', key: 'widthIn' },
                { header: 'QTY', key: 'qty' },
                { header: 'TOTAL SQ FT. SIZE', key: 'totalSqFt' },
                { header: 'EACH RATE', key: 'eachRate' },
                { header: 'GROSS AMOUNT', key: 'grossAmount' },
                { header: 'GST', key: 'gst' },
                { header: 'NET AMOUNT', key: 'netAmount' }
            ];
            worksheet.columns = columns.map(col => ({ ...col, width: 15 }));

            // Add data rows
            stores.forEach((store, index) => {
                // Calculate dimensions and costs based on board/pole data
                const boardWidth = store.boardWidth || 0;
                const boardHeight = store.boardHeight || 0;
                const boardCost = store.boardCost || 0;
                const poleQuantity = store.poleQuantity || 0;
                const poleWidth = store.poleWidth || 0;
                const poleHeight = store.poleHeight || 0;
                const poleCost = store.poleCost || 0;

                // Parse GPS location
                let gpsDisplay = '';
                if (store.gpsLocation) {
                    const gpsParts = store.gpsLocation.split('|');
                    if (gpsParts.length >= 3) {
                        gpsDisplay = gpsParts[0]; // Show address part
                    } else {
                        gpsDisplay = store.gpsLocation;
                    }
                }

                // Create GPS hyperlink function
                const createGpsHyperlink = (gpsLocation: string, displayText: string) => {
                    if (gpsLocation) {
                        const gpsParts = gpsLocation.split('|');
                        if (gpsParts.length >= 3) {
                            const lat = gpsParts[1];
                            const lng = gpsParts[2];
                            const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                            return {
                                formula: `HYPERLINK("${googleMapsUrl}", "${displayText}")`
                            };
                        }
                    }
                    return displayText;
                };

                // Add board row if board details exist
                if (boardWidth > 0 && boardHeight > 0) {
                    // Convert inches to feet (same as branduser-store-view)
                    const boardWidthInFeet = boardWidth / 12;
                    const boardHeightInFeet = boardHeight / 12;
                    const widthFt = +boardWidthInFeet.toFixed(2);
                    const heightFt = +boardHeightInFeet.toFixed(2);
                    const widthIn = boardWidth;
                    const heightIn = boardHeight;

                    // Calculate board costs (same logic as branduser-store-view)
                    const boardArea = boardWidthInFeet * boardHeightInFeet;
                    const boardGrossAmount = boardArea * boardCost;
                    const boardNetAmount = boardGrossAmount * 1.18; // Adding 18% GST (same as branduser-store-view)

                    const boardRow = worksheet.addRow({
                        assignmentName: store.assignmentName || '',
                        bdeName: store.bdeName || '',
                        bdmName: store.bdmName || '',
                        storeName: store.storeName || '',
                        location: `${store.storeAddress || ''} ${store.regionName || ''}`.trim(),
                        gpsLocation: createGpsHyperlink(store.gpsLocation, gpsDisplay),
                        mobileNumber: store.storePhoneNumber || '',
                        brandingType: `${store.boardName || 'Board'} (Board)`,
                        heightFt: heightFt,
                        widthFt: widthFt,
                        heightIn: heightIn,
                        widthIn: widthIn,
                        qty: 1, // Board quantity is always 1
                        totalSqFt: +boardArea.toFixed(2),
                        eachRate: +boardCost.toFixed(2),
                        grossAmount: +boardGrossAmount.toFixed(2),
                        gst: +(boardGrossAmount * 0.18).toFixed(2),
                        netAmount: +boardNetAmount.toFixed(2)
                    });

                    // Set GPS Location cell as hyperlink if coordinates are available
                    if (store.gpsLocation) {
                        const gpsParts = store.gpsLocation.split('|');
                        if (gpsParts.length >= 3) {
                            const gpsLocationCell = boardRow.getCell('gpsLocation');
                            if (gpsLocationCell.value && typeof gpsLocationCell.value === 'object' && 'formula' in gpsLocationCell.value) {
                                gpsLocationCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                            }
                        }
                    }
                }

                // Add pole row if pole details exist
                if (poleQuantity > 0 && poleWidth > 0 && poleHeight > 0) {
                    // Convert inches to feet (same as branduser-store-view)
                    const poleWidthInFeet = poleWidth / 12;
                    const poleHeightInFeet = poleHeight / 12;
                    const widthFt = +poleWidthInFeet.toFixed(2);
                    const heightFt = +poleHeightInFeet.toFixed(2);
                    const widthIn = poleWidth;
                    const heightIn = poleHeight;

                    // Calculate pole costs (same logic as branduser-store-view)
                    const poleArea = poleWidthInFeet * poleHeightInFeet;
                    const totalPoleArea = poleArea * poleQuantity;
                    const poleGrossAmount = totalPoleArea * poleCost;
                    const poleNetAmount = poleGrossAmount * 1.18; // Adding 18% GST (same as branduser-store-view)

                    const poleRow = worksheet.addRow({
                        assignmentName: store.assignmentName || '',
                        bdeName: store.bdeName || '',
                        bdmName: store.bdmName || '',
                        storeName: store.storeName || '',
                        location: `${store.storeAddress || ''} ${store.regionName || ''}`.trim(),
                        gpsLocation: createGpsHyperlink(store.gpsLocation, gpsDisplay),
                        mobileNumber: store.storePhoneNumber || '',
                        brandingType: `${store.boardName || 'Board'} (Pole)`,
                        heightFt: heightFt,
                        widthFt: widthFt,
                        heightIn: heightIn,
                        widthIn: widthIn,
                        qty: poleQuantity,
                        totalSqFt: +totalPoleArea.toFixed(2),
                        eachRate: +poleCost.toFixed(2),
                        grossAmount: +poleGrossAmount.toFixed(2),
                        gst: +(poleGrossAmount * 0.18).toFixed(2),
                        netAmount: +poleNetAmount.toFixed(2)
                    });

                    // Set GPS Location cell as hyperlink if coordinates are available
                    if (store.gpsLocation) {
                        const gpsParts = store.gpsLocation.split('|');
                        if (gpsParts.length >= 3) {
                            const gpsLocationCell = poleRow.getCell('gpsLocation');
                            if (gpsLocationCell.value && typeof gpsLocationCell.value === 'object' && 'formula' in gpsLocationCell.value) {
                                gpsLocationCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                            }
                        }
                    }
                }

                // If neither board nor pole exists, add a single row with default values
                if ((!boardWidth || !boardHeight) && (!poleQuantity || !poleWidth || !poleHeight)) {
                    const defaultRow = worksheet.addRow({
                        assignmentName: store.assignmentName || '',
                        bdeName: store.bdeName || '',
                        bdmName: store.bdmName || '',
                        storeName: store.storeName || '',
                        location: `${store.storeAddress || ''} ${store.regionName || ''}`.trim(),
                        gpsLocation: createGpsHyperlink(store.gpsLocation, gpsDisplay),
                        mobileNumber: store.storePhoneNumber || '',
                        brandingType: store.boardName || 'Board',
                        heightFt: 0,
                        widthFt: 0,
                        heightIn: 0,
                        widthIn: 0,
                        qty: 0,
                        totalSqFt: 0,
                        eachRate: 0,
                        grossAmount: 0,
                        gst: 0,
                        netAmount: 0
                    });

                    // Set GPS Location cell as hyperlink if coordinates are available
                    if (store.gpsLocation) {
                        const gpsParts = store.gpsLocation.split('|');
                        if (gpsParts.length >= 3) {
                            const gpsLocationCell = defaultRow.getCell('gpsLocation');
                            if (gpsLocationCell.value && typeof gpsLocationCell.value === 'object' && 'formula' in gpsLocationCell.value) {
                                gpsLocationCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                            }
                        }
                    }
                }
            });

            // Style the header row: sky blue background, bold, center, word wrap
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF87CEEB' } // Sky blue color
                };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            });

            // Center align all data cells
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: rowNumber === 1 };
                });
            });

            // Apply thin borders to all cells
            const lastRow = worksheet.lastRow ? worksheet.lastRow.number : worksheet.rowCount;
            const lastCol = worksheet.columns.length;
            for (let i = 1; i <= lastRow; i++) {
                const row = worksheet.getRow(i);
                for (let j = 1; j <= lastCol; j++) {
                    const cell = row.getCell(j);
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            }

            // Auto-fit column widths based on max length in each column
            worksheet.columns.forEach((column) => {
                let maxLength = 10;
                if (typeof column.eachCell === 'function') {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        let cellValue = '';
                        if (cell.value) {
                            // Check if cell.value is a formula object (for GPS hyperlinks)
                            if (typeof cell.value === 'object' && 'formula' in cell.value &&
                                typeof (cell.value as any).formula === 'string' &&
                                (cell.value as any).formula.startsWith('HYPERLINK')) {
                                // Extract the display text from the formula string
                                const match = (cell.value as any).formula.match(/HYPERLINK\(".*?",\s*"(.*?)"\)/);
                                cellValue = match ? match[1] : '';
                            } else if (typeof cell.value === 'object' && 'text' in cell.value) {
                                // For rich text
                                cellValue = (cell.value as any).text || '';
                            } else {
                                cellValue = cell.value.toString();
                            }
                        }
                        maxLength = Math.max(maxLength, cellValue.length + 2);
                    });
                }
                column.width = maxLength;
            });

            // Generate and download the file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getExcelFilename();
            a.click();
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Excel Exported',
                text: 'Excel file exported successfully!',
                confirmButtonText: 'OK',
                timer: 1300,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error generating Excel file:', error);
            throw error;
        }
    }

    private getExcelFilename(): string {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const hh = String(today.getHours()).padStart(2, '0');
        const min = String(today.getMinutes()).padStart(2, '0');
        const ss = String(today.getSeconds()).padStart(2, '0');
        const dateTimeStr = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

        return `Outlets_Report_${dateTimeStr}.xlsx`;
    }

    // PDF Export Methods
    async exportToPdf(): Promise<void> {
        if (this.stores.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data to Export',
                text: 'Please apply filters and search to get data for export.',
                confirmButtonText: 'OK'
            });
            return;
        }

        this.exportingPdf = true;

        try {
            // TODO: Get tenantId from auth service
            const tenantId = 1; // Temporary hardcoded value

            // Get assignment IDs and statuses from current filters
            const assignmentIds = this.selectedAssignments.length > 0
                ? this.selectedAssignments.map(a => a.id)
                : undefined;

            const vendorStatuses = this.selectedVendorStatuses.length > 0
                ? this.selectedVendorStatuses
                : undefined;

            const approvalStatuses = this.selectedApprovalStatuses.length > 0
                ? this.selectedApprovalStatuses
                : undefined;

            // Get frontend PDF data from backend
            const frontendPdfData = await this.reportService.getFrontendPdfData(
                tenantId,
                assignmentIds,
                vendorStatuses,
                approvalStatuses,
                this.startDate,
                this.endDate
            );

            if (frontendPdfData.stores.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Data Available',
                    text: 'No data available for PDF generation with the current filters.',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Generate PDF using frontend service
            await this.reportService.generateFrontendPdf(frontendPdfData.stores);

            Swal.fire({
                icon: 'success',
                title: 'PDF Exported',
                text: 'PDF report exported successfully!',
                confirmButtonText: 'OK',
                timer: 1300,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Error exporting to PDF. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            this.exportingPdf = false;
        }
    }

    private getPdfFilename(): string {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const hh = String(today.getHours()).padStart(2, '0');
        const min = String(today.getMinutes()).padStart(2, '0');
        const ss = String(today.getSeconds()).padStart(2, '0');
        const dateTimeStr = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

        return `Outlets_Report_${dateTimeStr}.pdf`;
    }
}

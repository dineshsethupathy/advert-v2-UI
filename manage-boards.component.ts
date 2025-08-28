import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StoreService, StoreListItem, ExcelStoreData, Brand, Distributor } from '../services/store.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { PdfService } from '../services/pdf.service';
import { PowerpointService } from '../services/powerpoint.service';
import { SafePipe } from '../pipes/safe.pipe';
import * as ExcelJS from 'exceljs';

interface ResultData {
  brandId: number;
  brandName: string;
  distributorId: number;
  distributorName: string;
  beforeExecutionStatus?: string;
  afterExecutionStatus?: string;
  beforeSubmittedDate?: string;
  afterSubmittedDate?: string;
  beforeExecutionActionOn?: string;
  beforeExecutionComments?: string;
  afterExecutionActionOn?: string;
  afterExecutionComments?: string;
}

@Component({
  selector: 'app-manage-boards',
  standalone: true,
  encapsulation: ViewEncapsulation.Emulated,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SafePipe],
  templateUrl: './manage-boards.component.html',
  styleUrls: ['./manage-boards.component.css']
})
export class ManageBoardsComponent implements OnInit {
  exportingExcel = false;
  showExcelTip = false;
  excelTipTimeout: any;
  excelBdmName: string = '';
  excelBdeName: string = '';

  // Filter properties
  selectedBrandId: number | null = null;
  selectedDistributorIds: number[] = [];
  brands: Brand[] = [];
  distributors: Distributor[] = [];
  showDistributorDropdown = false;
  vendorId: number | null = null;

  // --- ADDED FOR DISTRIBUTOR FILTER ---
  distributorFilterText: string = '';
  get filteredDistributors(): Distributor[] {
    if (!this.distributorFilterText) return this.distributors;
    return this.distributors.filter(d =>
      d.name.toLowerCase().includes(this.distributorFilterText.toLowerCase())
    );
  }
  // --- END ADDED ---

  // Results Grid properties
  showResultsGrid = false;
  loadingResultsGrid = false;
  resultsData: ResultData[] = [];
  generatingBeforePdf: number | null = null;
  generatingAfterPdf: number | null = null;
  generatingExcel: number | null = null;
  sendingBeforeApproval: number[] = [];
  sendingAfterApproval: number[] = [];

  // Action Details Modal properties
  showActionDetailsModal = false;
  actionDetailsData: {
    approval: ResultData;
    type: 'before' | 'after';
    status: string;
    actionTime?: string;
    comments?: string;
  } | null = null;

  // PDF Preview Modal properties
  showPdfPreviewModal = false;
  pdfPreviewUrl: string | null = null;
  pdfPreviewTitle: string | null = null;

  constructor(
    private storeService: StoreService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private pdfService: PdfService,
    private pptService: PowerpointService
  ) {
  }

  ngOnInit() {
    console.log('[ManageBoards] ngOnInit called');
    this.loadSessionData();
    // Close distributor dropdown on outside click
    document.addEventListener('click', () => {
      this.showDistributorDropdown = false;
      this.distributorFilterText = '';
    });
  }

  loadSessionData() {
    try {
      const executionInfo = sessionStorage.getItem('executionInfo');
      if (executionInfo) {
        const data = JSON.parse(executionInfo);
        if (data.vendorId) {
          this.vendorId = Number(data.vendorId);
          this.loadBrands();
          return;
        }
      }

      const userInfo = this.authService.getUserInfo();
      if (userInfo && userInfo.id) {
        this.vendorId = Number(userInfo.id);
        this.loadBrands();
      }
    } catch (error) {
      console.error('[ManageBoards] Error loading session data:', error);
    }
  }

  loadBrands() {
    this.storeService.getAllBrands().subscribe({
      next: (brands) => {
        this.brands = brands;
      },
      error: (error) => {
        console.error('Error loading brands:', error);
      }
    });
  }

  loadDistributors() {
    if (this.selectedBrandId) {
      this.storeService.getDistributorsByBrand(this.selectedBrandId).subscribe({
        next: (distributors) => {
          this.distributors = distributors;
          // Clear selected distributors when brand changes
          this.selectedDistributorIds = [];
        },
        error: (error) => {
          console.error('Error loading distributors:', error);
        }
      });
    } else {
      this.distributors = [];
      this.selectedDistributorIds = [];
    }
  }

  onBrandChange(event: any) {
    const brandId = event.target.value ? Number(event.target.value) : null;
    this.selectedBrandId = brandId;
    this.loadDistributors();
    this.showResultsGrid = false; // Hide results when brand changes
    this.selectedDistributorIds = [];
    this.distributorFilterText = '';
  }

  onDistributorCheckboxChange(distributorId: number, event: any) {
    event.stopPropagation();
    if (event.target.checked) {
      if (!this.selectedDistributorIds.includes(distributorId)) {
        this.selectedDistributorIds.push(distributorId);
      }
    } else {
      this.selectedDistributorIds = this.selectedDistributorIds.filter(id => id !== distributorId);
    }
    this.showResultsGrid = false; // Hide results when distributors change
  }

  getSelectedDistributorNames(): string {
    return this.selectedDistributorIds
      .map(id => this.distributors.find(d => d.id === id)?.name || '')
      .filter(name => name)
      .join(', ');
  }

  // Show Results functionality
  showResults() {
    if (!this.selectedBrandId || this.selectedDistributorIds.length === 0) {
      this.snackBar.open('Please select a brand and at least one distributor', 'Close', { duration: 3000 });
      return;
    }

    const selectedBrand = this.brands.find(b => b.id === this.selectedBrandId);
    if (!selectedBrand) {
      this.snackBar.open('Selected brand not found', 'Close', { duration: 3000 });
      return;
    }

    // Create results data for each selected distributor
    this.resultsData = this.selectedDistributorIds.map(distributorId => {
      const distributor = this.distributors.find(d => d.id === distributorId);
      return {
        brandId: this.selectedBrandId!,
        brandName: selectedBrand.name,
        distributorId: distributorId,
        distributorName: distributor?.name || 'Unknown',
        beforeExecutionStatus: undefined,
        afterExecutionStatus: undefined
      };
    });

    this.loadingResultsGrid = true; // Set loading state
    this.loadApprovalStatuses().then(() => {
      this.loadingResultsGrid = false; // Reset loading state after approval statuses are loaded
      this.showResultsGrid = true;
    });
  }

  // Scroll to results grid
  private scrollToResultsGrid() {
    const resultsContainer = document.querySelector('.results-container');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  }

  // Load approval statuses for the results
  loadApprovalStatuses(): Promise<void> {
    if (!this.vendorId) return Promise.resolve();

    return new Promise((resolve) => {
      this.storeService.getApprovalsByVendor(this.vendorId!).subscribe({
        next: (approvals) => {
          // Map approvals to results data
          this.resultsData.forEach(result => {
            const approval = approvals.find(a =>
              a.brandId === result.brandId &&
              a.distributorId === result.distributorId
            );

            if (approval) {
              result.beforeExecutionStatus = approval.beforeExecutionStatus;
              result.afterExecutionStatus = approval.afterExecutionStatus;
              result.beforeSubmittedDate = approval.beforeSubmittedDate;
              result.afterSubmittedDate = approval.afterSubmittedDate;
              result.beforeExecutionActionOn = approval.beforeExecutionActionOn;
              result.beforeExecutionComments = approval.beforeExecutionComments;
              result.afterExecutionActionOn = approval.afterExecutionActionOn;
              result.afterExecutionComments = approval.afterExecutionComments;
            } else {
              result.beforeExecutionStatus = undefined;
              result.afterExecutionStatus = undefined;
              result.beforeSubmittedDate = undefined;
              result.afterSubmittedDate = undefined;
              result.beforeExecutionActionOn = undefined;
              result.beforeExecutionComments = undefined;
              result.afterExecutionActionOn = undefined;
              result.afterExecutionComments = undefined;
            }
          });

          // Scroll to results grid after approval statuses are loaded
          setTimeout(() => {
            this.scrollToResultsGrid();
            resolve();
          }, 50);
        },
        error: (error) => {
          console.error('Error loading approval statuses:', error);
          // Keep existing statuses if API fails
          // Still scroll to results grid even if API fails
          setTimeout(() => {
            this.scrollToResultsGrid();
            resolve();
          }, 50);
        }
      });
    });
  }

  // Approval methods
  async sendForBeforeApproval(result: ResultData) {
    this.sendingBeforeApproval.push(result.distributorId);

    try {
      // Step 1: Get stores data
      const stores = await this.getStoresForBrandDistributor(result.brandId, result.distributorId);
      if (stores.length === 0) {
        this.sendingBeforeApproval = this.sendingBeforeApproval.filter(id => id !== result.distributorId);
        this.snackBar.open('No shops found for this brand-distributor combination', 'Close', { duration: 3000 });
        return;
      }

      const storeId = stores[0].id;
      const sortedStores = stores.sort((a, b) => {
        const aNum = parseInt(a.serialNumber, 10);
        const bNum = parseInt(b.serialNumber, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || '').localeCompare(b.serialNumber || '');
      });

      // Set vendor name on each store for PDF generation
      const userInfo = this.authService.getUserInfo();
      const vendorName = userInfo?.vendorName || 'N/A';
      sortedStores.forEach(store => store.vendor = vendorName);

      // Step 2: Generate PDF and Excel in parallel for better performance
      const [pdfData, excelData] = await Promise.allSettled([
        this.pdfService.generatePdfDataForUpload(sortedStores, false),
        this.generateExcelDataForApproval(result.brandId, result.distributorId)
      ]);

      // Handle PDF generation result
      let pdfDataResult: string | undefined;
      if (pdfData.status === 'fulfilled') {
        pdfDataResult = pdfData.value;
      } else {
        console.error('Error generating PDF data:', pdfData.reason);
        this.sendingBeforeApproval = this.sendingBeforeApproval.filter(id => id !== result.distributorId);
        this.snackBar.open('Error generating PDF. Please try again.', 'Close', { duration: 3000 });
        return;
      }

      // Handle Excel generation result (optional)
      let excelDataResult: string | undefined;
      if (excelData.status === 'fulfilled') {
        excelDataResult = excelData.value;
      } else {
        console.error('Error generating Excel data:', excelData.reason);
        // Continue without Excel if it fails
      }

      // Step 3: Send approval request
      const request = {
        brandId: result.brandId,
        distributorId: result.distributorId,
        vendorId: this.vendorId!,
        storeId: storeId,
        approvalType: 'Before',
        pdfData: pdfDataResult,
        excelData: excelDataResult,
        brandName: result.brandName,
        distributorName: result.distributorName
      };

      this.storeService.sendForApproval(request).subscribe({
        next: () => {
          result.beforeExecutionStatus = 'Submitted';
          result.beforeSubmittedDate = new Date().toISOString();
          this.sendingBeforeApproval = this.sendingBeforeApproval.filter(id => id !== result.distributorId);
          this.snackBar.open('Before execution approval request sent successfully', 'Close', { duration: 3000 });
        },
        error: (error: any) => {
          console.error('Error sending before approval:', error);
          this.sendingBeforeApproval = this.sendingBeforeApproval.filter(id => id !== result.distributorId);
          this.snackBar.open('Error sending approval request. Please try again.', 'Close', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('Error sending before approval:', error);
      this.sendingBeforeApproval = this.sendingBeforeApproval.filter(id => id !== result.distributorId);
      this.snackBar.open('Error sending approval request. Please try again.', 'Close', { duration: 3000 });
    }
  }

  async sendForAfterApproval(result: ResultData) {
    this.sendingAfterApproval.push(result.distributorId);

    try {
      // Step 1: Get stores data
      const stores = await this.getStoresForBrandDistributor(result.brandId, result.distributorId);
      if (stores.length === 0) {
        this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
        this.snackBar.open('No shops found for this brand-distributor combination', 'Close', { duration: 3000 });
        return;
      }

      // Filter stores that have after execution images
      const storesWithAfterImages = stores.filter(store => store.afterExecutionImageUrl);
      if (storesWithAfterImages.length === 0) {
        this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
        this.snackBar.open('No stores with after execution images found', 'Close', { duration: 3000 });
        return;
      }

      const storeId = stores[0].id;
      const sortedStores = storesWithAfterImages.sort((a, b) => {
        const aNum = parseInt(a.serialNumber, 10);
        const bNum = parseInt(b.serialNumber, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || '').localeCompare(b.serialNumber || '');
      });

      // Set vendor name on each store for PDF generation
      const userInfo = this.authService.getUserInfo();
      const vendorName = userInfo?.vendorName || 'N/A';
      sortedStores.forEach(store => store.vendor = vendorName);

      // Step 2: Generate PDF and Excel in parallel for better performance
      const [pdfData, excelData] = await Promise.allSettled([
        this.pdfService.generatePdfDataForUpload(sortedStores, true),
        this.generateExcelDataForApproval(result.brandId, result.distributorId)
      ]);

      // Handle PDF generation result
      let pdfDataResult: string | undefined;
      if (pdfData.status === 'fulfilled') {
        pdfDataResult = pdfData.value;
      } else {
        console.error('Error generating PDF data:', pdfData.reason);
        this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
        this.snackBar.open('Error generating PDF. Please try again.', 'Close', { duration: 3000 });
        return;
      }

      // Handle Excel generation result (optional)
      let excelDataResult: string | undefined;
      if (excelData.status === 'fulfilled') {
        excelDataResult = excelData.value;
      } else {
        console.error('Error generating Excel data:', excelData.reason);
        // Continue without Excel if it fails
      }

      // Step 3: Send approval request
      const request = {
        brandId: result.brandId,
        distributorId: result.distributorId,
        vendorId: this.vendorId!,
        storeId: storeId,
        approvalType: 'After',
        pdfData: pdfDataResult,
        excelData: excelDataResult,
        brandName: result.brandName,
        distributorName: result.distributorName
      };

      this.storeService.sendForApproval(request).subscribe({
        next: () => {
          result.afterExecutionStatus = 'Submitted';
          result.afterSubmittedDate = new Date().toISOString();
          this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
          this.snackBar.open('After execution approval request sent successfully', 'Close', { duration: 3000 });
        },
        error: (error: any) => {
          console.error('Error sending after approval:', error);
          this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
          this.snackBar.open('Error sending approval request. Please try again.', 'Close', { duration: 3000 });
        }
      });
    } catch (error) {
      console.error('Error sending after approval:', error);
      this.sendingAfterApproval = this.sendingAfterApproval.filter(id => id !== result.distributorId);
      this.snackBar.open('Error sending approval request. Please try again.', 'Close', { duration: 3000 });
    }
  }

  // Optimized method for generating Excel data for approval
  private async generateExcelDataForApproval(brandId: number, distributorId: number): Promise<string> {
    try {
      const distributorIdsString = distributorId.toString();
      const excelStores = await this.getExcelStoresData(brandId, distributorIdsString);
      if (excelStores.length > 0) {
        return await this.generateExcelData(excelStores);
      }
      return '';
    } catch (error) {
      console.error('Error generating Excel data for approval:', error);
      throw error;
    }
  }

  // Helper method to get Excel stores data
  private async getExcelStoresData(brandId: number, distributorIdsString: string): Promise<ExcelStoreData[]> {
    return new Promise((resolve, reject) => {
      this.storeService.getStoresForExcel(
        this.vendorId!,
        brandId,
        distributorIdsString
      ).subscribe({
        next: (stores: ExcelStoreData[]) => resolve(stores),
        error: (error) => reject(error)
      });
    });
  }

  // Helper method to generate Excel data as base64
  private async generateExcelData(stores: ExcelStoreData[]): Promise<string> {
    // console.log('generateExcelData', stores.length, 'stores');
    return new Promise(async (resolve, reject) => {
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Stores');

        // Define columns with new structure and ALL CAPS headers
        const columns = [
          { header: 'S.NO', key: 'sno' },
          { header: 'BDM NAME', key: 'bdmName' },
          { header: 'BDE NAME', key: 'bdeName' },
          { header: 'DISTRIBUTER NAME', key: 'distributerName' },
          { header: 'RETAILER/OUTLET NAME', key: 'storeName' },
          { header: 'LOCATION', key: 'address' },
          { header: 'GPS LOCATION', key: 'gpsLocation' },
          { header: 'MOBILE NUMBER', key: 'storePhoneNumber' },
          { header: 'BRANDING TYPE', key: 'boardType' },
          { header: 'WIDTH(FT)', key: 'widthFt' },
          { header: 'HEIGHT(FT)', key: 'heightFt' },
          { header: 'WIDTH(IN)', key: 'widthIn' },
          { header: 'HEIGHT(IN)', key: 'heightIn' },
          { header: 'QTY', key: 'qty' },
          { header: 'TOTAL SQ FT. SIZE', key: 'totalSqFt' },
          { header: 'EACH RATE', key: 'rate' },
          { header: 'GROSS AMOUNT', key: 'grossAmount' },
          { header: 'GST', key: 'gst' },
          { header: 'NET AMOUNT', key: 'netAmount' },
        ];
        worksheet.columns = columns.map(col => ({ ...col, width: 10 }));

        // Add data rows
        stores.forEach((store, index) => {
          // Parse board size to extract height and width in inches
          const boardSizeParts = (store.boardSize || '').split('x').map(part => parseFloat(part.trim()) || 0);
          const heightIn = boardSizeParts[0] || 0;
          const widthIn = boardSizeParts[1] || 0;
          // Convert to feet (1 ft = 12 in)
          const heightFt = +(heightIn / 12).toFixed(2);
          const widthFt = +(widthIn / 12).toFixed(2);
          const qty = store.quantityOfBoards;
          const totalSqFt = (qty * heightFt * widthFt).toFixed(2);
          // Ensure rate is always treated as decimal with two decimal places
          const rate = store.rate !== undefined && store.rate !== null ? parseFloat(store.rate.toString()).toFixed(2) : '0.00';
          // console.log(`[Excel Export] generateExcelData Store: ${store.storeName}, Rate:`, rate);
          const grossAmount = (parseFloat(totalSqFt) * parseFloat(rate)).toFixed(2);
          const gst = (parseFloat(grossAmount) * 0.18).toFixed(2);
          const netAmount = (parseFloat(grossAmount) + parseFloat(gst)).toFixed(2);

          worksheet.addRow({
            sno: index + 1,
            bdmName: this.excelBdmName || '',
            bdeName: this.excelBdeName || '',
            distributerName: store.distributerName || '',
            storeName: store.storeName || '',
            address: store.address || '',
            gpsLocation: '',
            storePhoneNumber: store.storePhoneNumber || '',
            boardType: store.boardType || '',
            widthFt: widthFt,
            heightFt: heightFt,
            widthIn: widthIn,
            heightIn: heightIn,
            qty: qty,
            totalSqFt: parseFloat(totalSqFt),
            rate: parseFloat(rate),
            grossAmount: parseFloat(grossAmount),
            gst: parseFloat(gst),
            netAmount: parseFloat(netAmount),
          });

          // Set the GPS Location cell as a hyperlink using coordinates
          if (store.gpsLocation && store.address) {
            const currentRow = worksheet.lastRow;
            if (currentRow) {
              const gpsLocationCell = currentRow.getCell('gpsLocation');
              // Parse GPS location to extract coordinates
              const gpsParts = store.gpsLocation.split('|');
              if (gpsParts.length >= 3) {
                const lat = gpsParts[1];
                const long = gpsParts[2];
                // Create Google Maps hyperlink with coordinates
                const googleMapsUrl = `https://www.google.com/maps?q=${lat},${long}`;
                gpsLocationCell.value = {
                  formula: `HYPERLINK("${googleMapsUrl}", "${gpsParts[0]}")`
                };
                // Set font color to blue for hyperlink
                gpsLocationCell.font = { color: { argb: 'FF0000FF' }, underline: true };
              } else {
                // Fallback: just show the address as plain text
                gpsLocationCell.value = store.address;
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

        // Auto-fit column widths based on max length in each column
        worksheet.columns.forEach((column) => {
          let maxLength = 10;
          if (typeof column.eachCell === 'function') {
            column.eachCell({ includeEmpty: true }, (cell) => {
              let cellValue = '';
              if (cell.value) {
                // Check if cell.value is a formula object
                if (typeof cell.value === 'object' && 'formula' in cell.value && typeof (cell.value as any).formula === 'string' && (cell.value as any).formula.startsWith('HYPERLINK')) {
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

        // Apply thin borders to all cells with data (header + data rows)
        const lastRow = worksheet.lastRow ? worksheet.lastRow.number : worksheet.rowCount;
        const lastCol = (worksheet.columns ?? []).length;
        for (let i = 1; i <= lastRow; i++) {
          const row = worksheet.getRow(i);
          for (let j = 1; j <= lastCol; j++) {
            const cell = row.getCell(j);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    });
  }



  getStatusText(status: string | undefined, type: 'before' | 'after'): string {
    if (!status) return 'Not Submitted';

    switch (status.toLowerCase()) {
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  }

  formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return '';

    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return dateTime;

      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateTime;
    }
  }

  // Action Details Modal methods
  showActionDetails(result: ResultData, type: 'before' | 'after') {
    const status = type === 'before' ? result.beforeExecutionStatus : result.afterExecutionStatus;
    const actionTime = type === 'before' ? result.beforeExecutionActionOn : result.afterExecutionActionOn;
    const comments = type === 'before' ? result.beforeExecutionComments : result.afterExecutionComments;

    this.actionDetailsData = {
      approval: result,
      type: type,
      status: status || '',
      actionTime: actionTime,
      comments: comments
    };

    this.showActionDetailsModal = true;
  }

  closeActionDetailsModal() {
    this.showActionDetailsModal = false;
    this.actionDetailsData = null;
  }

  closePdfPreviewModal() {
    this.showPdfPreviewModal = false;
    if (this.pdfPreviewUrl) {
      // Clean up the blob URL to prevent memory leaks
      URL.revokeObjectURL(this.pdfPreviewUrl);
    }
    this.pdfPreviewUrl = null;
    this.pdfPreviewTitle = null;
  }

  downloadPdfFromPreview() {
    if (!this.pdfPreviewUrl || !this.pdfPreviewTitle) return;

    const link = document.createElement('a');
    link.href = this.pdfPreviewUrl;

    // Create a clean filename from the title
    const cleanTitle = this.pdfPreviewTitle.replace(/[^a-zA-Z0-9\s-]/g, '_');
    const filename = `${cleanTitle}.pdf`;
    link.download = filename;

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('PDF downloaded successfully', 'Close', { duration: 3000 });
  }

  // Document generation methods with individual button states
  async generateBeforePdf(result: ResultData) {
    this.generatingBeforePdf = result.distributorId;
    // console.time('[PDF] generateBeforePdf total');
    try {
      // Get stores for this brand-distributor combination
      const stores = await this.getStoresForBrandDistributor(result.brandId, result.distributorId);
      // console.log(`[PDF] Store count for before PDF:`, stores.length);
      if (stores.length === 0) {
        this.snackBar.open('No shops found for this brand-distributor combination', 'Close', { duration: 3000 });
        return;
      }

      // Set vendor name on each store
      const userInfo = this.authService.getUserInfo();
      const vendorName = userInfo?.vendorName || 'N/A';
      stores.forEach(store => store.vendor = vendorName);

      // Sort stores by serial number
      const sortedStores = stores.sort((a, b) => {
        const aNum = parseInt(a.serialNumber, 10);
        const bNum = parseInt(b.serialNumber, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || '').localeCompare(b.serialNumber || '');
      });

      // Generate PDF as blob URL
      const pdfBlobUrl = await this.generatePdfBlobUrlWithProfiling(sortedStores, false);
      const title = `Before Execution - ${result.brandName} - ${result.distributorName}`;

      // Handle mobile vs desktop differently
      if (this.isMobileDevice()) {
        // Open PDF in new tab on mobile
        this.openPdfInNewTab(pdfBlobUrl, title);
        this.snackBar.open('PDF opened in new tab', 'Close', { duration: 2000 });
      } else {
        // Show preview modal on desktop
        this.pdfPreviewUrl = pdfBlobUrl;
        this.pdfPreviewTitle = title;
        this.showPdfPreviewModal = true;
      }
    } catch (error) {
      console.error('Error generating before PDF:', error);
      this.snackBar.open('Error generating before PDF. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.generatingBeforePdf = null;
      // console.timeEnd('[PDF] generateBeforePdf total');
    }
  }

  async generateAfterPdf(result: ResultData) {
    this.generatingAfterPdf = result.distributorId;
    // console.time('[PDF] generateAfterPdf total');
    try {
      // Get stores for this brand-distributor combination
      const stores = await this.getStoresForBrandDistributor(result.brandId, result.distributorId);
      // console.log(`[PDF] Store count for after PDF:`, stores.length);
      if (stores.length === 0) {
        this.snackBar.open('No shops found for this brand-distributor combination', 'Close', { duration: 3000 });
        return;
      }

      // Filter stores that have after execution images
      const storesWithAfterImages = stores.filter(store => store.afterExecutionImageUrl);
      // console.log(`[PDF] Stores with after images:`, storesWithAfterImages.length);
      if (storesWithAfterImages.length === 0) {
        this.snackBar.open('No stores with after execution images found', 'Close', { duration: 3000 });
        return;
      }

      // Set vendor name on each store
      const userInfo = this.authService.getUserInfo();
      const vendorName = userInfo?.vendorName || 'N/A';
      storesWithAfterImages.forEach(store => store.vendor = vendorName);

      // Sort stores by serial number
      const sortedStores = storesWithAfterImages.sort((a, b) => {
        const aNum = parseInt(a.serialNumber, 10);
        const bNum = parseInt(b.serialNumber, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || '').localeCompare(b.serialNumber || '');
      });

      // Generate PDF as blob URL
      const pdfBlobUrl = await this.generatePdfBlobUrlWithProfiling(sortedStores, true);
      const title = `After Execution - ${result.brandName} - ${result.distributorName}`;

      // Handle mobile vs desktop differently
      if (this.isMobileDevice()) {
        // Open PDF in new tab on mobile
        this.openPdfInNewTab(pdfBlobUrl, title);
        this.snackBar.open('PDF opened in new tab', 'Close', { duration: 2000 });
      } else {
        // Show preview modal on desktop
        this.pdfPreviewUrl = pdfBlobUrl;
        this.pdfPreviewTitle = title;
        this.showPdfPreviewModal = true;
      }
    } catch (error) {
      console.error('Error generating after PDF:', error);
      this.snackBar.open('Error generating after PDF. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.generatingAfterPdf = null;
      // console.timeEnd('[PDF] generateAfterPdf total');
    }
  }

  // Helper method to generate PDF as blob URL for preview, with profiling
  private async generatePdfBlobUrlWithProfiling(stores: StoreListItem[], includeAfterExecutionImage: boolean): Promise<string> {
    try {
      // console.time('[PDF] processStoresWithImages');
      const processedStores = await this.pdfService.processStoresWithImages(stores);
      // console.timeEnd('[PDF] processStoresWithImages');
      // console.log(`[PDF] Images processed for ${processedStores.length} stores`);

      // console.time('[PDF] createPdfDefinition');
      const docDefinition = await this.pdfService.createPdfDefinition(processedStores, includeAfterExecutionImage);
      // console.timeEnd('[PDF] createPdfDefinition');
      // console.log('[PDF] PDF definition created, attempting to generate PDF...');

      // console.time('[PDF] pdfMake.createPdf.getBlob');
      // Create PDF as blob
      return new Promise((resolve, reject) => {
        try {
          // console.log('[PDF] Calling pdfMake.createPdf...');
          const pdfDoc = (window as any).pdfMake.createPdf(docDefinition);
          // console.log('[PDF] PDF document created, getting blob...');
          pdfDoc.getBlob((blob: Blob) => {
            // console.log('[PDF] Blob received, size:', blob.size, 'type:', blob.type);
            const blobUrl = URL.createObjectURL(blob);
            // console.timeEnd('[PDF] pdfMake.createPdf.getBlob');
            resolve(blobUrl);
          });
        } catch (error) {
          console.error('[PDF] Error during PDF generation:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error generating PDF blob URL:', error);
      throw new Error('Error generating PDF for preview');
    }
  }

  // Helper method to detect mobile devices
  private isMobileDevice(): boolean {
    return window.innerWidth <= 768;
  }

  // Helper method to open PDF in new tab
  private openPdfInNewTab(blobUrl: string, title: string) {
    const newWindow = window.open(blobUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    } else {
      // Fallback if popup is blocked
      this.snackBar.open('Please allow popups to view PDF in new tab', 'Close', { duration: 3000 });
    }
  }

  async generateExcel(result: ResultData) {
    this.generatingExcel = result.distributorId;
    try {
      // Convert distributor ID to string for API call
      const distributorIdsString = result.distributorId.toString();

      this.storeService.getStoresForExcel(
        this.vendorId!,
        result.brandId,
        distributorIdsString
      ).subscribe({
        next: async (stores: ExcelStoreData[]) => {
          if (stores.length === 0) {
            this.snackBar.open('No data available for export', 'Close', { duration: 3000 });
            this.generatingExcel = null;
            return;
          }

          await this.exportExcelData(stores);
          this.generatingExcel = null;
        },
        error: (error: any) => {
          console.error('Error getting stores for Excel:', error);
          this.snackBar.open('Error exporting Excel. Please try again.', 'Close', { duration: 3000 });
          this.generatingExcel = null;
        }
      });
    } catch (error) {
      console.error('Error in generateExcel:', error);
      this.snackBar.open('Error exporting Excel. Please try again.', 'Close', { duration: 3000 });
      this.generatingExcel = null;
    }
  }

  // Helper method to get stores for brand-distributor combination
  private async getStoresForBrandDistributor(brandId: number, distributorId: number): Promise<StoreListItem[]> {
    return new Promise((resolve, reject) => {
      this.storeService.getStoresByVendorId(this.vendorId!, brandId, distributorId).subscribe({
        next: (stores) => resolve(stores),
        error: (error) => reject(error)
      });
    });
  }

  // Brand methods
  onBrandInput(event: any) {
    const value = event.target.value.toLowerCase();
    // this.selectedBrand = null; // This line was removed
    // this.filteredBrands = this.brands.filter(brand => // This line was removed
    //   brand.name.toLowerCase().includes(value)
    // );
    // this.showBrandSuggestions = true; // This line was removed
  }

  selectBrand(brand: Brand) {
    // this.selectedBrand = brand; // This line was removed
    // this.showBrandSuggestions = false; // This line was removed
  }

  onBrandBlur() {
    // this.showBrandSuggestions = false; // This line was removed
  }

  onDistributorInput(event: any) {
    const value = event.target.value.toLowerCase();
    // this.selectedDistributor = null; // This line was removed
    // this.filteredDistributors = this.distributors.filter(distributor => // This line was removed
    //   distributor.name.toLowerCase().includes(value)
    // );
    // this.showDistributorSuggestions = true; // This line was removed
  }

  selectDistributor(distributor: Distributor) {
    // this.selectedDistributor = distributor; // This line was removed
    // this.showDistributorSuggestions = false; // This line was removed
  }

  onDistributorBlur() {
    // this.showDistributorSuggestions = false; // This line was removed
  }



  goToAfterPdf() {
    this.router.navigate(['/after-pdf']);
  }

  loadFilterOptions() {
    // console.log('🔄 Loading filter options...');
    // console.log('🏷️ Current vendorId:', this.vendorId);

    if (!this.vendorId) {
      // console.log('⚠️ No vendorId available, cannot load filter options');
      return;
    }

    this.storeService.getStoresByVendorId(this.vendorId).subscribe({
      next: (stores) => {
        // console.log('📊 Received stores for vendorId:', this.vendorId, 'Count:', stores.length);
        // console.log('📋 Sample stores:', stores.slice(0, 3));

        // Extract unique brands and distributors from stores
        const uniqueBrands = new Set<string>();
        const uniqueDistributors = new Set<string>();

        stores.forEach(store => {
          if (store.brandName) {
            uniqueBrands.add(store.brandName.trim());
          }
          if (store.distributerName) {
            uniqueDistributors.add(store.distributerName.trim());
          }
        });

        // this.availableBrands = Array.from(uniqueBrands).sort(); // This line was removed
        // this.availableDistributors = Array.from(uniqueDistributors).sort(); // This line was removed

        // console.log('🏷️ Available brands:', this.availableBrands);
        // console.log('🏷️ Available distributors:', this.availableDistributors);
      },
      error: (error) => {
        // console.error('❌ Error loading filter options:', error);
      }
    });
  }

  onFilterChange() {
    // console.log('🔄 Filter changed:');
    // console.log('🏷️ Selected brand:', this.selectedBrand);
    // console.log('🏷️ Selected distributors:', this.selectedDistributors);
    // console.log('🏷️ Vendor ID:', this.vendorId);
  }

  private getExcelFilename(): string {
    const brandName = this.brands.find(b => b.id === this.selectedBrandId)?.name || 'Unknown';

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Generate filename based on number of selected distributors
    if (this.selectedDistributorIds.length === 1) {
      // If only one distributor is selected, include its name
      const distributorName = this.distributors.find(d => d.id === this.selectedDistributorIds[0])?.name || 'Unknown';
      return `${brandName}_${distributorName}_${dateStr}.xlsx`;
    } else {
      // If multiple distributors are selected, use only brand name
      return `${brandName}_${dateStr}.xlsx`;
    }
  }

  async exportExcel() {
    if (!this.selectedBrandId) {
      this.snackBar.open('Please select a brand', 'Close', { duration: 3000 });
      return;
    }

    if (this.selectedDistributorIds.length === 0) {
      this.snackBar.open('Please select at least one distributor', 'Close', { duration: 3000 });
      return;
    }

    this.exportingExcel = true;
    this.showExcelTip = true;

    try {
      // Convert distributor IDs to comma-separated string
      const distributorIdsString = this.selectedDistributorIds
        .map(id => id.toString())
        .join(',');

      this.storeService.getStoresForExcel(
        this.vendorId!,
        this.selectedBrandId,
        distributorIdsString
      ).subscribe({
        next: async (stores: ExcelStoreData[]) => {
          if (stores.length === 0) {
            this.snackBar.open('No data available for export', 'Close', { duration: 3000 });
            this.exportingExcel = false;
            return;
          }

          await this.exportExcelData(stores);
          // console.log(`[Excel Export] exportExcelData Store: ${JSON.stringify(stores)}`);
          this.exportingExcel = false;

          setTimeout(() => {
            this.showExcelTip = false;
          }, 5000);
        },
        error: (error) => {
          console.error('Error getting stores for Excel:', error);
          this.snackBar.open('Error exporting Excel. Please try again.', 'Close', { duration: 3000 });
          this.exportingExcel = false;
        }
      });
    } catch (error) {
      console.error('Error in exportExcel:', error);
      this.snackBar.open('Error exporting Excel. Please try again.', 'Close', { duration: 3000 });
      this.exportingExcel = false;
    }
  }

  private async exportExcelData(stores: ExcelStoreData[]) {
    // console.log('📊 Starting Excel data export with', stores.length, 'stores');
    // console.log('📋 First few stores for Excel:', stores.slice(0, 3));

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stores');

      // Define columns with new structure and ALL CAPS headers
      const columns = [
        { header: 'S.NO', key: 'sno' },
        { header: 'FDM NAME', key: 'bdmName' },
        { header: 'FDE NAME', key: 'bdeName' },
        { header: 'DISTRIBUTER NAME', key: 'distributerName' },
        { header: 'RETAILER/OUTLET NAME', key: 'storeName' },
        { header: 'LOCATION', key: 'address' },
        { header: 'GPS LOCATION', key: 'gpsLocation' },
        { header: 'MOBILE NUMBER', key: 'storePhoneNumber' },
        { header: 'BRANDING TYPE', key: 'boardType' },
        { header: 'WIDTH(FT)', key: 'widthFt' },
        { header: 'HEIGHT(FT)', key: 'heightFt' },
        { header: 'WIDTH(IN)', key: 'widthIn' },
        { header: 'HEIGHT(IN)', key: 'heightIn' },
        { header: 'QTY', key: 'qty' },
        { header: 'TOTAL SQ FT. SIZE', key: 'totalSqFt' },
        { header: 'EACH RATE', key: 'rate' },
        { header: 'GROSS AMOUNT', key: 'grossAmount' },
        { header: 'GST', key: 'gst' },
        { header: 'NET AMOUNT', key: 'netAmount' },
      ];
      worksheet.columns = columns.map(col => ({ ...col, width: 10 }));

      // Add data rows
      stores.forEach((store, index) => {
        // Parse board size to extract height and width in inches
        const boardSizeParts = (store.boardSize || '').split('x').map(part => parseFloat(part.trim()) || 0);
        const heightIn = boardSizeParts[0] || 0;
        const widthIn = boardSizeParts[1] || 0;
        // Convert to feet (1 ft = 12 in)
        const heightFt = +(heightIn / 12).toFixed(2);
        const widthFt = +(widthIn / 12).toFixed(2);
        const qty = store.quantityOfBoards;
        const totalSqFt = (qty * heightFt * widthFt).toFixed(2);
        // Ensure rate is always treated as decimal with two decimal places
        const rate = store.rate !== undefined && store.rate !== null ? parseFloat(store.rate.toString()).toFixed(2) : '0.00';
        // console.log(`[Excel Export] exportExcelData Store: ${store.storeName}, Rate:`, store.rate);
        const grossAmount = (parseFloat(totalSqFt) * parseFloat(rate)).toFixed(2);
        const gst = (parseFloat(grossAmount) * 0.18).toFixed(2);
        const netAmount = (parseFloat(grossAmount) + parseFloat(gst)).toFixed(2);

        worksheet.addRow({
          sno: index + 1,
          bdmName: this.excelBdmName || '',
          bdeName: this.excelBdeName || '',
          distributerName: store.distributerName || '',
          storeName: store.storeName || '',
          address: store.address || '',
          gpsLocation: '', // We'll set this as a formula after adding the row
          storePhoneNumber: store.storePhoneNumber || '',
          boardType: store.boardType || '',
          widthFt: widthFt,
          heightFt: heightFt,
          widthIn: widthIn,
          heightIn: heightIn,
          qty: qty,
          totalSqFt: parseFloat(totalSqFt),
          rate: parseFloat(rate),
          grossAmount: parseFloat(grossAmount),
          gst: parseFloat(gst),
          netAmount: parseFloat(netAmount),
        });

        // Set the GPS Location cell as a hyperlink using coordinates
        if (store.gpsLocation && store.address) {
          const currentRow = worksheet.lastRow;
          if (currentRow) {
            const gpsLocationCell = currentRow.getCell('gpsLocation');
            // Parse GPS location to extract coordinates
            const gpsParts = store.gpsLocation.split('|');
            if (gpsParts.length >= 3) {
              const lat = gpsParts[1];
              const long = gpsParts[2];
              // console.log('GPS: ' + gpsParts[0]);
              // Create Google Maps hyperlink with coordinates
              const googleMapsUrl = `https://www.google.com/maps?q=${lat},${long}`;
              gpsLocationCell.value = {
                formula: `HYPERLINK("${googleMapsUrl}", "${gpsParts[0]}")`
              };
              // Set font color to blue for hyperlink
              gpsLocationCell.font = { color: { argb: 'FF0000FF' }, underline: true };
            } else {
              // Fallback: just show the address as plain text
              gpsLocationCell.value = store.address;
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

      // Auto-fit column widths based on max length in each column
      worksheet.columns.forEach((column) => {
        let maxLength = 10;
        if (typeof column.eachCell === 'function') {
          column.eachCell({ includeEmpty: true }, (cell) => {
            let cellValue = '';
            if (cell.value) {
              // Check if cell.value is a formula object
              if (typeof cell.value === 'object' && 'formula' in cell.value && typeof (cell.value as any).formula === 'string' && (cell.value as any).formula.startsWith('HYPERLINK')) {
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

      // Apply thin borders to all cells with data (header + data rows)
      const lastRow = worksheet.lastRow ? worksheet.lastRow.number : worksheet.rowCount;
      const lastCol = (worksheet.columns ?? []).length;
      for (let i = 1; i <= lastRow; i++) {
        const row = worksheet.getRow(i);
        for (let j = 1; j <= lastCol; j++) {
          const cell = row.getCell(j);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.getExcelFilename();
      a.click();
      window.URL.revokeObjectURL(url);
      // console.log('✅ Excel export completed successfully');
      this.snackBar.open('Excel exported successfully!', 'Close', { duration: 3000 });
    } catch (error) {
      // console.error('❌ Error exporting Excel:', error);
      this.snackBar.open('Error exporting Excel. Please try again.', 'Close', { duration: 3000 });
    } finally {
      // console.log('🏁 Excel export process finished');
      this.exportingExcel = false;
    }
  }

  goBack() {
    window.history.back();
  }

  goToBoardSetup() {
    this.router.navigate(['/board-setup']);
  }

  goToManageBrands() {
    this.router.navigate(['/manage-brands']);
  }
} 
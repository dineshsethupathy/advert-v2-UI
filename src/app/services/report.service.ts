import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Set up the virtual file system for pdfMake
const pdfMakeInstance = pdfMake as any;
pdfMakeInstance.vfs = (pdfFonts as any).vfs;

export interface StoreFrontendPdfData {
    storeName: string;
    boardWidth?: number;
    boardHeight?: number;
    boardName?: string;
    beforeExecutionImageUrl?: string;
    afterExecutionImageUrl?: string;
}

export interface FrontendPdfResult {
    stores: StoreFrontendPdfData[];
    totalCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    constructor(private http: HttpClient) { }

    // Method to get the HAP logo as base64
    private async getHapLogoBase64(): Promise<string> {
        try {
            // Convert the HAP logo image to base64
            const response = await this.http.get('assets/images/hap-logo.png', { responseType: 'blob' }).toPromise();
            if (!response) {
                return '';
            }
            const blob = response as Blob;

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    resolve(result);
                };
                reader.onerror = (error) => {
                    resolve(''); // Resolve with empty string instead of rejecting
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            return '';
        }
    }

    // Method to get the TONRIN logo as base64
    private async getTonrinLogoBase64(): Promise<string> {
        try {
            // Convert the TONRIN logo image to base64
            const response = await this.http.get('assets/images/T_Tonrin.png', { responseType: 'blob' }).toPromise();
            if (!response) {
                return '';
            }
            const blob = response as Blob;

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    resolve(result);
                };
                reader.onerror = (error) => {
                    resolve(''); // Resolve with empty string instead of rejecting
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            return '';
        }
    }

    // Get frontend PDF data from backend
    async getFrontendPdfData(
        tenantId: number,
        assignmentIds?: number[],
        statuses?: string[],
        startDate?: string,
        endDate?: string
    ): Promise<FrontendPdfResult> {
        const params = new URLSearchParams();
        params.append('tenantId', tenantId.toString());

        if (assignmentIds && assignmentIds.length > 0) {
            params.append('assignmentIds', assignmentIds.join(','));
        }

        if (statuses && statuses.length > 0) {
            params.append('statuses', statuses.join(','));
        }

        if (startDate) {
            params.append('startDate', startDate);
        }

        if (endDate) {
            params.append('endDate', endDate);
        }

        const response = await this.http.get<FrontendPdfResult>(
            `${environment.apiUrl}/report/get-frontend-pdf-data?${params.toString()}`
        ).toPromise();

        if (!response) {
            throw new Error('No response from server');
        }

        return response;
    }

    // Generate PDF using pdfMake
    async generateFrontendPdf(stores: StoreFrontendPdfData[]): Promise<void> {
        if (stores.length === 0) {
            throw new Error('No stores to generate PDF for');
        }

        try {
            // Process stores with compressed images
            const processedStores = await this.processStoresWithImages(stores);

            // Create PDF definition
            const docDefinition = await this.createPdfDefinition(processedStores);

            // Generate PDF
            const pdfDoc = pdfMake.createPdf(docDefinition);

            // Download PDF
            const filename = `Outlet_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            pdfDoc.download(filename);
        } catch (error) {
            console.error('Error generating frontend PDF:', error);
            throw error;
        }
    }

    // Process stores with image compression
    private async processStoresWithImages(stores: StoreFrontendPdfData[]): Promise<StoreFrontendPdfData[]> {
        return Promise.all(stores.map(async (store) => {
            const processedStore = { ...store };

            // Process images if they exist
            if (store.beforeExecutionImageUrl) {
                try {
                    processedStore.beforeExecutionImageUrl = await this.compressAndConvertImage(store.beforeExecutionImageUrl);
                } catch (error) {
                    console.warn('Failed to process before execution image:', error);
                    processedStore.beforeExecutionImageUrl = undefined;
                }
            }

            if (store.afterExecutionImageUrl) {
                try {
                    processedStore.afterExecutionImageUrl = await this.compressAndConvertImage(store.afterExecutionImageUrl);
                } catch (error) {
                    console.warn('Failed to process after execution image:', error);
                    processedStore.afterExecutionImageUrl = undefined;
                }
            }

            return processedStore;
        }));
    }

    // Compress and convert image to base64
    private async compressAndConvertImage(imageUrl: string): Promise<string> {
        try {
            // If it's already a base64 URL, return it
            if (imageUrl.startsWith('data:image')) {
                return imageUrl;
            }
            console.log('imageUrl: ', imageUrl);
            // Fetch the image
            const response = await fetch(imageUrl);
            let blob = await response.blob();

            // Compress the image
            blob = await this.compressImage(blob, 0.4, 1280, 1280);

            // Convert to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    // Image compression helper
    private async compressImage(
        fileOrBlob: File | Blob,
        quality: number = 0.4,
        maxWidth: number = 1280,
        maxHeight: number = 1280
    ): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e: any) => {
                img.src = e.target.result;
            };

            img.onload = () => {
                let { width, height } = img;

                // Scale down if needed, preserving aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    const aspect = width / height;
                    if (width > height) {
                        width = maxWidth;
                        height = Math.round(maxWidth / aspect);
                    } else {
                        height = maxHeight;
                        width = Math.round(maxHeight * aspect);
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx!.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Compression failed'));
                    },
                    'image/jpeg',
                    quality
                );
            };

            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(fileOrBlob);
        });
    }

    // Create PDF definition
    private async createPdfDefinition(stores: StoreFrontendPdfData[]): Promise<any> {
        // Get the HAP logo as base64
        const hapLogoBase64 = await this.getHapLogoBase64();
        const tonrinLogoBase64 = await this.getTonrinLogoBase64();

        const pages = stores.map((store, index) =>
            this.createStorePage(store, index, index === stores.length - 1, hapLogoBase64, tonrinLogoBase64)
        );

        return {
            content: pages,
            defaultStyle: {
                font: 'Roboto'
            },
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10],
                    color: '#F0060B'
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 5],
                    color: '#4a5568'
                },
                normal: {
                    fontSize: 10,
                    margin: [0, 2, 0, 2]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'white',
                    fillColor: '#6366f1'
                },
                tableRow: {
                    fontSize: 9
                }
            },
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60]
        };
    }

    // Create individual store page
    private createStorePage(store: StoreFrontendPdfData, index: number, isLastPage: boolean = false, hapLogoBase64: string, tonrinLogoBase64: string): any {
        const pageContent = [
            // Store Information Table
            {
                table: {
                    headerRows: 1,
                    widths: ['35%', '65%'],
                    body: [
                        [
                            { text: 'Store Name', style: 'tableHeader' },
                            { text: store.storeName || 'N/A', style: 'tableRow' }
                        ],
                        [
                            { text: 'Board Type', style: 'tableHeader' },
                            { text: store.boardName || 'N/A', style: 'tableRow' }
                        ],
                        [
                            { text: 'Board Size', style: 'tableHeader' },
                            { text: this.formatBoardSize(store.boardWidth, store.boardHeight) || 'N/A', style: 'tableRow' }
                        ]
                    ]
                },
                margin: [0, 30, 0, 20]
            },

            // Images Section
            {
                text: 'Shop Images',
                style: 'subheader',
                margin: [0, 20, 0, 10]
            },

            // Images table
            {
                layout: {
                    hLineWidth: function (i: number, node: any) { return 1; },
                    vLineWidth: function (i: number, node: any) { return 1; },
                    hLineColor: function (i: number, node: any) { return '#cbd5e1'; },
                    vLineColor: function (i: number, node: any) { return '#cbd5e1'; },
                    paddingLeft: function () { return 0; },
                    paddingRight: function () { return 0; },
                    paddingTop: function () { return 0; },
                    paddingBottom: function () { return 0; }
                },
                table: {
                    widths: ['50%', '50%'],
                    body: [
                        [
                            // Before Execution (left)
                            {
                                stack: [
                                    {
                                        text: 'Before Execution',
                                        style: 'normal',
                                        bold: true,
                                        alignment: 'center',
                                        margin: [0, 8, 0, 8]
                                    },
                                    store.beforeExecutionImageUrl ? {
                                        image: store.beforeExecutionImageUrl,
                                        width: 250,
                                        height: 180,
                                        fit: [250, 180],
                                        alignment: 'center',
                                        margin: [0, 0, 0, 8]
                                    } : {
                                        text: 'No before execution image available',
                                        style: 'normal',
                                        italics: true,
                                        color: '#718096',
                                        alignment: 'center',
                                        margin: [0, 10, 0, 0]
                                    }
                                ],
                                margin: [0, 0, 5, 0]
                            },
                            // After Execution (right)
                            {
                                stack: [
                                    {
                                        text: 'After Execution',
                                        style: 'normal',
                                        bold: true,
                                        alignment: 'center',
                                        margin: [0, 8, 0, 8]
                                    },
                                    store.afterExecutionImageUrl ? {
                                        image: store.afterExecutionImageUrl,
                                        width: 250,
                                        height: 180,
                                        fit: [250, 180],
                                        alignment: 'center',
                                        margin: [0, 0, 0, 8]
                                    } : {
                                        text: 'No after execution image available',
                                        style: 'normal',
                                        italics: true,
                                        color: '#ef4444',
                                        alignment: 'center',
                                        margin: [0, 10, 0, 0]
                                    }
                                ],
                                margin: [5, 0, 0, 0]
                            }
                        ]
                    ]
                },
                margin: [0, 0, 0, 0]
            }
        ];

        return {
            stack: this.addLogosToPage(pageContent, hapLogoBase64, tonrinLogoBase64),
            pageBreak: isLastPage ? null : 'after'
        };
    }

    // Add HAP logo to the top left and TONRIN logo to the top right of each page
    private addLogosToPage(pageContent: any[], hapLogoBase64: string, tonrinLogoBase64: string): any[] {
        const logoElements = [];

        // Add HAP logo at top left with 50% opacity
        if (hapLogoBase64) {
            const hapLogoElement = {
                image: hapLogoBase64,
                width: 40,
                height: 40,
                alignment: 'left',
                margin: [0, 0, 0, 0],
                absolutePosition: { x: 40, y: 40 }, // Top left corner
                opacity: 0.5 // 50% opacity
            };
            logoElements.push(hapLogoElement);
        }

        // Add TONRIN logo at top right with 50% opacity
        if (tonrinLogoBase64) {
            const tonrinLogoElement = {
                image: tonrinLogoBase64,
                width: 40,
                height: 40,
                alignment: 'right',
                margin: [0, 0, 0, 0],
                absolutePosition: { x: 500, y: 40 }, // Top right corner
                opacity: 0.5 // 50% opacity
            };
            logoElements.push(tonrinLogoElement);
        }

        // Add spacing below logos and then the page content
        const spacingElement = {
            text: '',
            margin: [0, 60, 0, 0] // Add 60px top margin to move content below logos
        };

        return [...logoElements, spacingElement, ...pageContent];
    }

    // Format board size as width x height
    private formatBoardSize(width?: number, height?: number): string {
        if (!width || !height) return '';
        return `${width}" x ${height}"`;
    }
}

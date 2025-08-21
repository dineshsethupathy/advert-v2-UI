import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { StoreService, StoreData, StoreListItem, Board } from '../services/store.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { LocationPickerModal } from '../location-picker-modal/location-picker-modal';
import { RouterModule } from '@angular/router';

// Utility function to compress an image file or blob using canvas, with optional max dimensions
async function compressImage(
  fileOrBlob: File | Blob,
  quality: number = 0.5,
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

@Component({
  selector: 'app-add-store',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './add-store.component.html',
  styleUrls: ['./add-store.component.css']
})
export class AddStoreComponent implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoElementAfter') videoElementAfter!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasElementAfter') canvasElementAfter!: ElementRef<HTMLCanvasElement>;

  form: FormGroup;
  boardTypes: string[] = [];
  boards: Board[] = [];
  imagePreviewUrl: string | ArrayBuffer | null = null;
  fieldErrors: { [key: string]: string } = {};

  // Edit mode properties
  isEditMode = false;
  storeId: string | null = null;
  originalStore: StoreListItem | null = null;

  // Image URLs for display in edit mode
  bannerDesignImageUrl: string | null = null;
  beforeExecutionImageUrl: string | null = null;
  afterExecutionImageUrl: string | null = null;

  // Camera properties
  isCameraOpen = false;
  stream: MediaStream | null = null;
  capturedImageUrl: string | null = null;

  // Camera properties for After Execution
  isCameraOpenAfter = false;
  streamAfter: MediaStream | null = null;
  capturedImageUrlAfter: string | null = null;

  // Image editing properties
  isEditing = false;
  isDrawing = false;
  startX = 0;
  startY = 0;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  originalImage: HTMLImageElement | null = null;
  originalImageUrl: string | null = null;

  // Image editing properties for After Execution
  isEditingAfter = false;
  isDrawingAfter = false;
  startXAfter = 0;
  startYAfter = 0;
  canvasAfter: HTMLCanvasElement | null = null;
  ctxAfter: CanvasRenderingContext2D | null = null;
  originalImageAfter: HTMLImageElement | null = null;
  originalImageUrlAfter: string | null = null;

  showAfterExecutionField = false;
  allStores: StoreListItem[] = [];
  isGettingLocation = false;
  // Add a property to store vendorId
  vendorId: number | null = null;
  isLoading = false;
  isEditLoading = false;

  get submitButtonText() {
    if (this.isLoading) {
      return this.isEditMode ? 'Updating...' : 'Saving...';
    }
    return this.isEditMode ? 'Update' : 'Save';
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private storeService: StoreService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      brandId: ['', Validators.required],  // Add brandId control
      brandName: [''],  // Optional now
      distributorId: ['', Validators.required],  // Add distributorId control
      distributerName: [''],  // Optional now
      vendorId: ['', Validators.required],  // Add vendorId control
      vendor: [''],  // Optional now
      storeName: ['', Validators.required],
      storePhoneNumber: [''],
      serialNumber: ['', Validators.required],
      boardHeight: [''],
      boardWidth: [''],
      boardSize: [''],
      boardType: [''],
      boardId: [null],
      address: [''], // <-- removed Validators.required
      gpsLocation: [''],
      bannerDesign: [''],
      beforeExecutionImage: [''],
      afterExecutionImage: [''],
      quantityOfBoards: [null],
      hasPole: [false],
      poleQuantity: [null],
      poleHeight: [null],
      poleWidth: [null],
      poleSize: [''],
      executionStartDate: [''],
      executionEndDate: [''],
      bdmName: [''],
      bdeName: ['']
    });

    // Listen for changes and clear errors for fields as soon as they become valid
    this.form.valueChanges.subscribe(values => {
      const fields = [
        'brandName', 'vendor', 'distributerName', 'storeName', 'storePhoneNumber', 'serialNumber', 'boardHeight', 'boardWidth', 'boardType', 'address',
        'bannerDesign', 'beforeExecutionImage', 'afterExecutionImage', 'poleQuantity'
      ];
      fields.forEach(field => {
        if (this.fieldErrors[field] && values[field] && (typeof values[field] === 'string' ? values[field].trim() !== '' : true)) {
          delete this.fieldErrors[field];
        }
      });
    });
    // Always keep serialNumber and quantityOfBoards disabled
    this.form.get('serialNumber')?.disable({ emitEvent: false });
    // Do NOT subscribe to valueChanges for serial number auto-population here
  }

  ngOnInit() {
    // Always scroll to top when opening the page
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, 0);

    // Fetch all stores for serial number auto-population
    const execInfoRaw = sessionStorage.getItem('executionInfo');
    if (execInfoRaw) {
      try {
        const execInfo = JSON.parse(execInfoRaw);
        this.vendorId = execInfo.vendorId ? Number(execInfo.vendorId) : null;

        if (this.vendorId) {
          // Fetch board types dynamically after vendorId is set
          this.storeService.getAllBoards(this.vendorId).subscribe({
            next: (boards) => {
              this.boards = boards;
              // Filter out 'Pole' (case-insensitive) from board types and sort alphabetically
              this.boardTypes = Array.from(new Set(boards.map(b => b.boardType).filter(Boolean)))
                .filter(type => type.toLowerCase() !== 'pole')
                .sort((a, b) => a.localeCompare(b));
            },
            error: (err) => {
              console.error('Failed to fetch board types:', err);
              this.boardTypes = [];
            }
          });

          // Get brandId and distributorId from execInfo
          const brandId = execInfo.brandId ? Number(execInfo.brandId) : undefined;
          const distributorId = execInfo.distributorId ? Number(execInfo.distributorId) : undefined;

          this.storeService.getStoresByVendorId(this.vendorId, brandId, distributorId).subscribe(stores => {
            this.allStores = stores;
            this.form.patchValue({
              brandId: execInfo.brandId || null,
              brandName: execInfo.brandName || '',
              distributorId: execInfo.distributorId || null,
              distributerName: execInfo.distributorName || '',
              vendorId: execInfo.vendorId,
              vendor: execInfo.vendorName || ''
            });

            // Now call updateSerialNumber after allStores and form are ready
            setTimeout(() => {
              this.updateSerialNumber();
              // Now subscribe to valueChanges for serial number auto-population
              this.form.get('brandId')?.valueChanges.subscribe(() => this.updateSerialNumber());
              this.form.get('distributorId')?.valueChanges.subscribe(() => this.updateSerialNumber());
              this.form.get('vendorId')?.valueChanges.subscribe(() => this.updateSerialNumber());
            }, 0);
          });
        }
      } catch (error) {
        console.error('Error parsing execution info:', error);
      }
    }

    // Check if we're in edit mode by looking for store ID in route params
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.storeId = id;
        this.isEditLoading = true;
        this.loadStoreForEditing(id);
        // Subscribe to hasPole changes to clear poleQuantity if user checks it and there was no original pole
        setTimeout(() => {
          const hasPoleControl = this.form.get('hasPole');
          if (hasPoleControl) {
            hasPoleControl.valueChanges.subscribe((checked: boolean) => {
              if (checked && this.isEditMode && (!this.originalStore || !this.originalStore.poleSize)) {
                this.form.patchValue({ poleQuantity: '' });
              }
            });
          }
        }, 0);
      } else {
        this.isEditMode = false;
        this.form.get('serialNumber')?.disable();
      }
    });
    // Check for fromAfter query param
    this.route.queryParams.subscribe(params => {
      this.showAfterExecutionField = params['fromAfter'] === 'true';
    });
  }

  updateSerialNumber() {
    if (this.isEditMode) return;

    const brandId = this.form.get('brandId')?.value;
    const distributorId = this.form.get('distributorId')?.value;
    const vendorId = this.form.get('vendorId')?.value;

    if (brandId && distributorId && vendorId) {
      // Get filtered stores directly from the API
      this.storeService.getStoresByVendorId(vendorId, brandId, distributorId).subscribe(stores => {
        // Find the highest serial number among the stores
        const serials = stores
          .map(s => Number(s.serialNumber))
          .filter(n => !isNaN(n));
        const maxSerial = serials.length > 0 ? Math.max(...serials) : 0;
        const nextSerial = (maxSerial + 1).toString();
        this.form.get('serialNumber')?.setValue(nextSerial, { emitEvent: false });
        this.form.get('serialNumber')?.disable({ emitEvent: false });
      });
    } else {
      // Missing fields, cannot calculate serial
      console.log('Missing brandId, distributorId, or vendorId for serial number calculation');
      this.form.get('serialNumber')?.setValue('', { emitEvent: false });
      this.form.get('serialNumber')?.disable({ emitEvent: false });
    }
  }

  onBoardTypeChange() {
    const selectedBoardType = this.form.get('boardType')?.value;
    if (selectedBoardType) {
      const selectedBoard = this.boards.find(b => b.boardType === selectedBoardType);
      if (selectedBoard) {
        this.form.get('boardId')?.setValue(selectedBoard.id);
      }
    }
  }

  loadStoreForEditing(storeId: string) {
    this.storeService.getStoreById(storeId).subscribe({
      next: (store) => {
        this.originalStore = store;
        this.populateFormWithStoreData(store);
        this.isEditLoading = false;
      },
      error: (error) => {
        console.error('Error loading store for editing:', error);
        alert('Error loading store data. Please try again.');
        this.isEditLoading = false;
        // this.router.navigate(['/list-store']);
      }
    });
  }

  populateFormWithStoreData(store: StoreListItem) {
    // console.log(store.storePhoneNumber);

    // Helper function to format date for HTML date input
    const formatDateForInput = (date: Date | string | null | undefined): string => {
      if (!date) return '';

      let dateObj: Date;
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        dateObj = date;
      }

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) return '';

      return dateObj.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    };

    this.form.patchValue({
      brandId: store.brandId,
      brandName: store.brandName,
      distributorId: store.distributorId,
      distributerName: store.distributerName || '',
      vendorId: store.vendorId,
      vendor: store.vendor || '',
      storeName: store.storeName,
      storePhoneNumber: store.storePhoneNumber || '',
      serialNumber: store.serialNumber,
      executionStartDate: formatDateForInput(store.executionStartDate),
      executionEndDate: formatDateForInput(store.executionEndDate),
      bdmName: store.bdmName || '',
      bdeName: store.bdeName || '',
      boardHeight: store.boardSize ? store.boardSize.split('x')[0]?.trim() : '',
      boardWidth: store.boardSize ? store.boardSize.split('x')[1]?.trim() : '',
      boardType: store.boardType,
      boardId: store.boardId,
      quantityOfBoards: store.quantityOfBoards || 1,
      // others: store.others || '',
      address: store.address,
      gpsLocation: store.gpsLocation || '',
      // --- Pole fields ---
      hasPole: !!store.poleSize,
      poleHeight: store.poleSize ? store.poleSize.split('x')[0]?.trim() : '',
      poleWidth: store.poleSize ? store.poleSize.split('x')[1]?.trim() : '',
      poleQuantity: store.poleQuantity || 1
    });
    // Always disable serialNumber and quantityOfBoards field after patching
    this.form.get('serialNumber')?.disable({ emitEvent: false });
    this.form.get('quantityOfBoards')?.disable({ emitEvent: false });

    // Do NOT call updateSerialNumber in edit mode; just use the value from backend

    // Load images using HTTP calls
    this.loadImagesForEdit(store);
  }

  loadImagesForEdit(store: StoreListItem) {
    // Load banner design image
    if (store.bannerDesignUrl) {
      this.storeService.getImageFromBlobUrl(store.bannerDesignUrl).subscribe({
        next: (imageUrl) => {
          this.bannerDesignImageUrl = imageUrl;
          this.imagePreviewUrl = imageUrl;
          // Use the already-fetched imageUrl (blob URL) for the placeholder
          this.createPlaceholderFile(store.bannerDesignUrl!, 'bannerDesign', imageUrl);
        },
        error: (error) => {
          console.error('Error loading banner design image:', error);
          // Fallback to direct URL
          this.imagePreviewUrl = store.bannerDesignUrl || null;
          if (store.bannerDesignUrl) {
            this.createPlaceholderFile(store.bannerDesignUrl, 'bannerDesign');
          }
        }
      });
    }

    // Load before execution image
    if (store.beforeExecutionImageUrl) {
      this.storeService.getImageFromBlobUrl(store.beforeExecutionImageUrl).subscribe({
        next: (imageUrl) => {
          this.beforeExecutionImageUrl = imageUrl;
          this.capturedImageUrl = imageUrl;
          this.originalImageUrl = imageUrl; // Set original image URL for editing
          // Use the already-fetched imageUrl (blob URL) for the placeholder
          this.createPlaceholderFile(store.beforeExecutionImageUrl!, 'beforeExecutionImage', imageUrl);
        },
        error: (error) => {
          console.error('Error loading before execution image:', error);
          // Fallback to direct URL
          this.capturedImageUrl = store.beforeExecutionImageUrl || null;
          this.originalImageUrl = store.beforeExecutionImageUrl || null; // Set original image URL for editing
          if (store.beforeExecutionImageUrl) {
            this.createPlaceholderFile(store.beforeExecutionImageUrl, 'beforeExecutionImage');
          }
        }
      });
    }

    // Load after execution image only if showAfterExecutionField is true
    if (this.showAfterExecutionField && store.afterExecutionImageUrl) {
      this.storeService.getImageFromBlobUrl(store.afterExecutionImageUrl).subscribe({
        next: (imageUrl) => {
          this.afterExecutionImageUrl = imageUrl;
          this.capturedImageUrlAfter = imageUrl;
          this.originalImageUrlAfter = imageUrl; // Set original image URL for editing
          // Use the already-fetched imageUrl (blob URL) for the placeholder
          this.createPlaceholderFile(store.afterExecutionImageUrl!, 'afterExecutionImage', imageUrl);
        },
        error: (error) => {
          console.error('Error loading after execution image:', error);
          // Fallback to direct URL
          this.capturedImageUrlAfter = store.afterExecutionImageUrl || null;
          this.originalImageUrlAfter = store.afterExecutionImageUrl || null; // Set original image URL for editing
          if (store.afterExecutionImageUrl) {
            this.createPlaceholderFile(store.afterExecutionImageUrl, 'afterExecutionImage');
          }
        }
      });
    }
  }

  // Accepts an optional imageUrlOrBlob parameter to avoid redundant backend calls
  createPlaceholderFile(imageUrl: string, fieldName: string, imageUrlOrBlob?: string | Blob) {
    if (imageUrlOrBlob) {
      // If a blob URL or Blob is provided, use it directly
      if (typeof imageUrlOrBlob === 'string') {
        fetch(imageUrlOrBlob)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], `${fieldName}.jpg`, { type: 'image/jpeg' });
            this.form.patchValue({ [fieldName]: file });
          })
          .catch(error => {
            console.error('Error creating placeholder file:', error);
          });
      } else {
        // If it's already a Blob
        const file = new File([imageUrlOrBlob], `${fieldName}.jpg`, { type: 'image/jpeg' });
        this.form.patchValue({ [fieldName]: file });
      }
      return;
    }
    // Fallback: fetch from backend as before
    this.storeService.getImageFromBlobUrl(imageUrl).subscribe({
      next: (blobUrl: string) => {
        fetch(blobUrl)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], `${fieldName}.jpg`, { type: 'image/jpeg' });
            this.form.patchValue({ [fieldName]: file });
          })
          .catch(error => {
            console.error('Error creating placeholder file:', error);
          });
      },
      error: (error) => {
        console.error('Error loading image for placeholder:', error);
      }
    });
  }

  async openCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      this.isCameraOpen = true;

      // Wait for video element to be available
      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions and try again.');
    }
  }

  captureImage() {
    if (!this.stream) return;

    const canvas = document.createElement('canvas');
    const video = this.videoElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          this.capturedImageUrl = URL.createObjectURL(blob);
          this.originalImageUrl = this.capturedImageUrl; // Store original image URL
          this.form.patchValue({ beforeExecutionImage: blob });
          if (this.fieldErrors['beforeExecutionImage']) {
            delete this.fieldErrors['beforeExecutionImage'];
          }
          this.closeCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCameraOpen = false;
  }

  removeCapturedImage() {
    if (this.capturedImageUrl) {
      URL.revokeObjectURL(this.capturedImageUrl);
      this.capturedImageUrl = null;
    }
    if (this.originalImageUrl) {
      URL.revokeObjectURL(this.originalImageUrl);
      this.originalImageUrl = null;
    }
    // Clear the display URL used in edit mode
    this.beforeExecutionImageUrl = null;
    this.form.patchValue({ beforeExecutionImage: null });
    this.isEditing = false;
  }

  onCapturedImageFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.capturedImageUrl = URL.createObjectURL(file);
      this.originalImageUrl = this.capturedImageUrl;
      this.beforeExecutionImageUrl = this.capturedImageUrl; // Ensure preview updates in edit mode
      this.form.patchValue({ beforeExecutionImage: file });
      if (this.fieldErrors['beforeExecutionImage']) {
        delete this.fieldErrors['beforeExecutionImage'];
      }
      event.target.value = '';
    }
  }

  onCapturedImageFileChangeAfter(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.capturedImageUrlAfter = URL.createObjectURL(file);
      this.originalImageUrlAfter = this.capturedImageUrlAfter;
      this.afterExecutionImageUrl = this.capturedImageUrlAfter; // Ensure preview updates
      this.form.patchValue({ afterExecutionImage: file });
      if (this.fieldErrors['afterExecutionImage']) {
        delete this.fieldErrors['afterExecutionImage'];
      }
      event.target.value = '';
    }
  }

  // After Execution Camera Methods
  async openCameraAfter() {
    try {
      this.streamAfter = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      this.isCameraOpenAfter = true;

      // Wait for video element to be available
      setTimeout(() => {
        if (this.videoElementAfter) {
          this.videoElementAfter.nativeElement.srcObject = this.streamAfter;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions and try again.');
    }
  }

  captureImageAfter() {
    if (!this.streamAfter) return;

    const canvas = document.createElement('canvas');
    const video = this.videoElementAfter.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          this.capturedImageUrlAfter = URL.createObjectURL(blob);
          this.originalImageUrlAfter = this.capturedImageUrlAfter; // Store original image URL
          this.form.patchValue({ afterExecutionImage: blob });
          this.closeCameraAfter();
        }
      }, 'image/jpeg', 0.8);
    }
  }

  closeCameraAfter() {
    if (this.streamAfter) {
      this.streamAfter.getTracks().forEach(track => track.stop());
      this.streamAfter = null;
    }
    this.isCameraOpenAfter = false;
  }

  removeCapturedImageAfter() {
    if (this.capturedImageUrlAfter) {
      URL.revokeObjectURL(this.capturedImageUrlAfter);
      this.capturedImageUrlAfter = null;
    }
    if (this.originalImageUrlAfter) {
      URL.revokeObjectURL(this.originalImageUrlAfter);
      this.originalImageUrlAfter = null;
    }
    // Clear the display URL used in edit mode
    this.afterExecutionImageUrl = null;
    this.form.patchValue({ afterExecutionImage: null });
    this.isEditingAfter = false;
  }

  // After Execution Editing Methods
  startEditingAfter() {
    if (!this.capturedImageUrlAfter) return;

    this.isEditingAfter = true;
    setTimeout(() => {
      this.initializeCanvasAfter();
    }, 100);
  }

  initializeCanvasAfter() {
    if (!this.canvasElementAfter) return;

    this.canvasAfter = this.canvasElementAfter.nativeElement;
    this.ctxAfter = this.canvasAfter.getContext('2d');

    if (!this.ctxAfter) return;

    this.originalImageAfter = new Image();
    this.originalImageAfter.onload = () => {
      if (!this.canvasAfter || !this.ctxAfter) return;
      this.canvasAfter.width = this.originalImageAfter!.width;
      this.canvasAfter.height = this.originalImageAfter!.height;
      this.ctxAfter.drawImage(this.originalImageAfter!, 0, 0);
      this.setupCanvasEventsAfter();
    };
    // Always use capturedImageUrlAfter if available
    this.originalImageAfter.src = this.capturedImageUrlAfter || this.originalImageUrlAfter!;
  }

  setupCanvasEventsAfter() {
    if (!this.canvasAfter) return;

    this.canvasAfter.addEventListener('mousedown', this.onMouseDownAfter.bind(this));
    this.canvasAfter.addEventListener('mousemove', this.onMouseMoveAfter.bind(this));
    this.canvasAfter.addEventListener('mouseup', this.onMouseUpAfter.bind(this));

    // Touch events for mobile
    this.canvasAfter.addEventListener('touchstart', this.onTouchStartAfter.bind(this));
    this.canvasAfter.addEventListener('touchmove', this.onTouchMoveAfter.bind(this));
    this.canvasAfter.addEventListener('touchend', this.onTouchEndAfter.bind(this));
  }

  onMouseDownAfter(e: MouseEvent) {
    this.isDrawingAfter = true;
    const rect = this.canvasAfter!.getBoundingClientRect();
    const scaleX = this.canvasAfter!.width / rect.width;
    const scaleY = this.canvasAfter!.height / rect.height;
    this.startXAfter = (e.clientX - rect.left) * scaleX;
    this.startYAfter = (e.clientY - rect.top) * scaleY;
  }

  onMouseMoveAfter(e: MouseEvent) {
    if (!this.isDrawingAfter || !this.ctxAfter) return;

    const rect = this.canvasAfter!.getBoundingClientRect();
    const scaleX = this.canvasAfter!.width / rect.width;
    const scaleY = this.canvasAfter!.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    this.drawRectangleAfter(this.startXAfter, this.startYAfter, currentX - this.startXAfter, currentY - this.startYAfter);
  }

  onMouseUpAfter() {
    this.isDrawingAfter = false;
  }

  onTouchStartAfter(e: TouchEvent) {
    e.preventDefault();
    this.isDrawingAfter = true;
    const rect = this.canvasAfter!.getBoundingClientRect();
    const scaleX = this.canvasAfter!.width / rect.width;
    const scaleY = this.canvasAfter!.height / rect.height;
    const touch = e.touches[0];
    this.startXAfter = (touch.clientX - rect.left) * scaleX;
    this.startYAfter = (touch.clientY - rect.top) * scaleY;
  }

  onTouchMoveAfter(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDrawingAfter || !this.ctxAfter) return;

    const rect = this.canvasAfter!.getBoundingClientRect();
    const scaleX = this.canvasAfter!.width / rect.width;
    const scaleY = this.canvasAfter!.height / rect.height;
    const touch = e.touches[0];
    const currentX = (touch.clientX - rect.left) * scaleX;
    const currentY = (touch.clientY - rect.top) * scaleY;

    this.drawRectangleAfter(this.startXAfter, this.startYAfter, currentX - this.startXAfter, currentY - this.startYAfter);
  }

  onTouchEndAfter() {
    this.isDrawingAfter = false;
  }

  drawRectangleAfter(x: number, y: number, width: number, height: number) {
    if (!this.ctxAfter || !this.originalImageAfter) return;

    // Check if original image is still valid
    if (this.originalImageAfter.complete && this.originalImageAfter.naturalWidth !== 0) {
      // Clear canvas and redraw original image
      this.ctxAfter.clearRect(0, 0, this.canvasAfter!.width, this.canvasAfter!.height);
      this.ctxAfter.drawImage(this.originalImageAfter, 0, 0);

      // Calculate normalized line width based on canvas size
      const normalizedLineWidth = Math.max(3, Math.min(15, this.canvasAfter!.width / 100));

      // Draw rectangle border only
      this.ctxAfter.strokeStyle = '#ff0000';
      this.ctxAfter.lineWidth = normalizedLineWidth;
      this.ctxAfter.strokeRect(x, y, width, height);
    } else {
      // Reload the original image if it's broken
      this.originalImageAfter.src = this.originalImageUrlAfter!;
    }
  }

  clearCanvasAfter() {
    if (!this.ctxAfter || !this.originalImageAfter) return;

    // Check if original image is still valid
    if (this.originalImageAfter.complete && this.originalImageAfter.naturalWidth !== 0) {
      this.ctxAfter.clearRect(0, 0, this.canvasAfter!.width, this.canvasAfter!.height);
      this.ctxAfter.drawImage(this.originalImageAfter, 0, 0);
    } else {
      // Reload the original image if it's broken
      this.originalImageAfter.src = this.originalImageUrlAfter!;
    }
  }

  saveEditedImageAfter() {
    if (!this.canvasAfter) return;

    this.canvasAfter.toBlob((blob) => {
      if (blob) {
        // Update the captured image URL with the edited version
        if (this.capturedImageUrlAfter && this.capturedImageUrlAfter !== this.originalImageUrlAfter) {
          URL.revokeObjectURL(this.capturedImageUrlAfter);
        }
        this.capturedImageUrlAfter = URL.createObjectURL(blob);
        this.afterExecutionImageUrl = this.capturedImageUrlAfter; // Update display URL
        this.form.patchValue({ afterExecutionImage: blob });
        if (this.fieldErrors['afterExecutionImage']) {
          delete this.fieldErrors['afterExecutionImage'];
        }
        this.isEditingAfter = false;
      }
    }, 'image/jpeg', 0.9);
  }

  cancelEditingAfter() {
    this.isEditingAfter = false;
    this.removeCanvasEventsAfter();
  }

  removeCanvasEventsAfter() {
    if (!this.canvasAfter) return;

    this.canvasAfter.removeEventListener('mousedown', this.onMouseDownAfter.bind(this));
    this.canvasAfter.removeEventListener('mousemove', this.onMouseMoveAfter.bind(this));
    this.canvasAfter.removeEventListener('mouseup', this.onMouseUpAfter.bind(this));
    this.canvasAfter.removeEventListener('touchstart', this.onTouchStartAfter.bind(this));
    this.canvasAfter.removeEventListener('touchmove', this.onTouchMoveAfter.bind(this));
    this.canvasAfter.removeEventListener('touchend', this.onTouchEndAfter.bind(this));
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.form.patchValue({ bannerDesign: file });
      if (this.fieldErrors['bannerDesign']) {
        delete this.fieldErrors['bannerDesign'];
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result;
        this.bannerDesignImageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.imagePreviewUrl = null;
      this.bannerDesignImageUrl = null;
      this.form.patchValue({ bannerDesign: null });
    }
  }

  async captureLocation() {
    this.isGettingLocation = true;
    if (!navigator.geolocation) {
      this.form.patchValue({ gpsLocation: JSON.stringify({ address: 'Location access denied or unavailable.', coords: '' }) });
      this.isGettingLocation = false;
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = '';
        try {
          address = await this.reverseGeocode(latitude, longitude);
        } catch (e) {
          address = 'Location unavailable';
        }
        this.form.patchValue({
          gpsLocation: JSON.stringify({
            address: address || 'Location unavailable',
            coords: `${latitude}, ${longitude}`
          })
        });
        navigator.geolocation.clearWatch(watchId);
        this.isGettingLocation = false;
      },
      (error) => {
        this.form.patchValue({ gpsLocation: JSON.stringify({ address: 'Location access denied or unavailable.', coords: '' }) });
        this.isGettingLocation = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  openLocationPicker() {
    let coords = null;
    const gpsVal = this.form.get('gpsLocation')?.value;
    if (gpsVal) {
      try {
        const parsed = JSON.parse(gpsVal);
        if (parsed.coords && typeof parsed.coords === 'string') {
          const [lat, lng] = parsed.coords.split(',').map((v: string) => parseFloat(v.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            coords = { lat, lng };
          }
        }
      } catch { }
    }
    const dialogRef = this.dialog.open(LocationPickerModal, {
      width: '90vw',
      maxWidth: '500px',
      data: { coords }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.address && result.coords) {
        this.form.patchValue({
          gpsLocation: JSON.stringify({ address: result.address, coords: result.coords })
        });
      }
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    return data.display_name || 'Address not found';
  }

  parseGpsLocation(val: string): { address: string, coords: string } {
    if (!val) return { address: '', coords: '' };

    // Check if it's in the pipe-separated format (address|lat|long)
    if (val.includes('|')) {
      const parts = val.split('|');
      if (parts.length >= 3) {
        const address = parts[0];
        const lat = parseFloat(parts[1]).toFixed(5);
        const long = parseFloat(parts[2]).toFixed(5);
        return {
          address: address,
          coords: `${lat}, ${long}`
        };
      }
    }

    // Try to parse as JSON (legacy format)
    try {
      return JSON.parse(val);
    } catch {
      return { address: val, coords: '' };
    }
  }

  async onSubmit() {
    if (this.isLoading) return;
    this.isLoading = true;

    // Clear previous errors
    this.fieldErrors = {};

    if (this.form.invalid) {
      // Check for phone number specific error
      const phoneControl = this.form.get('storePhoneNumber');
      if (phoneControl && phoneControl.value && phoneControl.invalid) {
        this.fieldErrors['storePhoneNumber'] = 'Store Phone Number must be exactly 10 digits.';
      }

      // Check for other required fields from the form
      const formRequiredFields = ['storeName', 'serialNumber']; // <-- removed 'address'
      formRequiredFields.forEach(field => {
        const control = this.form.get(field);
        if (control && (!control.value || control.value.trim() === '')) {
          this.fieldErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }
      });

      this.isLoading = false;
      return;
    }

    // --- FIX: Enable serialNumber field to include it in validation and value ---
    const serialNumberControl = this.form.get('serialNumber');
    let wasDisabled = false;
    if (serialNumberControl && serialNumberControl.disabled) {
      serialNumberControl.enable({ emitEvent: false });
      wasDisabled = true;
    }
    // ---------------------------------------------------------------

    // Validate required fields
    const execInfoRaw = sessionStorage.getItem('executionInfo');
    let execInfo;
    try {
      execInfo = execInfoRaw ? JSON.parse(execInfoRaw) : null;
    } catch (error) {
      console.error('Error parsing execution info:', error);
      execInfo = null;
    }

    if (!execInfo) {
      this.fieldErrors['general'] = 'Session information is missing. Please try again.';
      this.isLoading = false;
      return;
    }

    const requiredFields = [
      { field: 'brandId', name: 'Brand', value: execInfo.brandId },
      { field: 'distributorId', name: 'Distributor', value: execInfo.distributorId },
      { field: 'vendorId', name: 'Vendor', value: execInfo.vendorId },
      { field: 'storeName', name: 'Store Name', value: this.form.get('storeName')?.value },
      { field: 'serialNumber', name: 'Serial Number', value: this.form.get('serialNumber')?.value },
      // { field: 'address', name: 'Address', value: this.form.get('address')?.value }, // <-- removed address from requiredFields
    ];

    const missingFields = requiredFields.filter(field => {
      if (typeof field.value === 'string') {
        return !field.value || field.value.trim() === '';
      } else if (typeof field.value === 'number') {
        return !field.value || field.value <= 0;
      } else {
        return !field.value;
      }
    });

    if (missingFields.length > 0) {
      // Set error messages for missing fields
      missingFields.forEach(field => {
        this.fieldErrors[field.field] = `${field.name} is required`;
      });
      // --- FIX: Optionally disable serialNumber field again ---
      if (serialNumberControl && wasDisabled) {
        serialNumberControl.disable({ emitEvent: false });
      }
      // ------------------------------------------------------
      this.isLoading = false;
      return;
    }

    try {
      // Show loading state
      // Remove direct DOM manipulation of button text
      // Prepare the data
      const formData = this.form.value;

      // Compose boardSize from height and width
      const boardHeight = this.form.value.boardHeight;
      const boardWidth = this.form.value.boardWidth;
      const boardSize = boardHeight && boardWidth ? `${boardHeight} x ${boardWidth}` : '';
      // Compose poleSize from poleHeight and poleWidth if hasPole is checked
      let poleSize: string | null = null;
      let poleQuantity: number | null = null;
      if (this.form.value.hasPole) {
        const poleHeight = this.form.value.poleHeight;
        const poleWidth = this.form.value.poleWidth;
        poleQuantity = this.form.value.poleQuantity || 1;
        if (poleHeight && poleWidth) {
          poleSize = `${poleHeight} x ${poleWidth}`;
        }
      }
      // Convert gpsLocation JSON to pipe-separated string for backend
      let gpsLocationString = '';
      if (formData.gpsLocation) {
        try {
          const gps = JSON.parse(formData.gpsLocation);
          if (gps.address && gps.coords) {
            // Parse coordinates from "lat, lng" format
            const coordsParts = gps.coords.split(',').map((coord: string) => coord.trim());
            if (coordsParts.length === 2) {
              const latitude = coordsParts[0];
              const longitude = coordsParts[1];
              // Format: address|lat|long
              gpsLocationString = `${gps.address}|${latitude}|${longitude}`;
            } else {
              gpsLocationString = gps.address;
            }
          } else {
            gpsLocationString = gps.address || gps.coords || '';
          }
        } catch {
          gpsLocationString = formData.gpsLocation;
        }
      }
      // Get vendorId from component property (set during form patching)
      const storeData: StoreData = {
        ...this.form.value,
        // Set IDs from executionInfo
        brandId: execInfo.brandId,
        distributorId: execInfo.distributorId,
        vendorId: execInfo.vendorId,
        brandName: execInfo.brandName || '',
        distributerName: execInfo.distributorName || '',
        vendor: execInfo.vendorName || '',
        // Always send quantityOfBoards as 1 because the field is always disabled and set to 1 in the UI.
        // This avoids sending null to the backend when the control is disabled.
        quantityOfBoards: 1,
        boardSize,
        // Remove boardHeight and boardWidth from payload
        boardHeight: undefined,
        boardWidth: undefined,
        gpsLocation: gpsLocationString,
        poleSize: poleSize,
        poleQuantity: poleQuantity,
        // Add vendorId if available
        ...(this.vendorId ? { vendorId: this.vendorId } : {}),
        // Add poleId if editing and it exists
        ...(this.isEditMode && this.originalStore && this.originalStore.poleId ? { poleId: this.originalStore.poleId } : {}),
        // Convert empty date strings to null to prevent SQL Server from using 1900-01-01
        executionStartDate: this.form.value.executionStartDate || null,
        executionEndDate: this.form.value.executionEndDate || null,
        bdmName: this.form.value.bdmName || null,
        bdeName: this.form.value.bdeName || null,
        // --- FIX: boardId should be null if not selected or empty ---
        boardId: this.form.value.boardId ? this.form.value.boardId : null
      };


      // Compress images before converting to base64 and sending to backend
      if (formData.bannerDesign) {
        // Send the original banner image without compression or resizing
        storeData.bannerDesign = await this.storeService.fileToBase64(formData.bannerDesign);
      }
      if (formData.beforeExecutionImage) {
        const compressedBeforeBlob = await compressImage(formData.beforeExecutionImage, 0.5, 1280, 1280);
        const compressedBeforeFile = new File([compressedBeforeBlob], 'beforeExecutionImage.jpg', { type: 'image/jpeg' });
        storeData.beforeExecutionImage = await this.storeService.blobToBase64(compressedBeforeFile);
      }
      if (formData.afterExecutionImage) {
        const compressedAfterBlob = await compressImage(formData.afterExecutionImage, 0.5, 1280, 1280);
        const compressedAfterFile = new File([compressedAfterBlob], 'afterExecutionImage.jpg', { type: 'image/jpeg' });
        storeData.afterExecutionImage = await this.storeService.blobToBase64(compressedAfterFile);
      }

      // --- FIX: Optionally disable serialNumber field again ---
      if (serialNumberControl && wasDisabled) {
        serialNumberControl.disable({ emitEvent: false });
      }
      // ------------------------------------------------------

      // Submit to backend based on mode
      const request = this.isEditMode && this.storeId
        ? this.storeService.updateStore(this.storeId, storeData)
        : this.storeService.addStore(storeData);

      request.subscribe({
        next: (response) => {
          const message = this.isEditMode
            ? 'Store updated successfully!'
            : `Store saved successfully! Store ID: ${response.storeId}`;
          //alert(message);
          if (this.showAfterExecutionField) {
            this.router.navigate(['/view-after-store', response.storeId]);
          } else {
            if (!this.isEditMode) {
              this.router.navigate(['/view-store', response.storeId], { queryParams: { fromAdd: 'true' } });
            } else {
              this.router.navigate(['/view-store', response.storeId]);
            }
          }
          this.snackBar.open('Store saved successfully!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error saving store:', error);
          const errorMessage = this.isEditMode
            ? 'Error updating store. Please try again.'
            : 'Error saving store. Please try again.';
          alert(errorMessage);
          // Reset button state on error
          // Remove direct DOM manipulation of button text
          this.isLoading = false;
        },
        complete: () => {
          // Reset button state
          // Remove direct DOM manipulation of button text
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error preparing data:', error);
      alert('Error preparing data. Please try again.');

      // Reset button state
      // Remove direct DOM manipulation of button text
      this.isLoading = false;
    }
  }

  onCancel() {
    window.history.back();
  }

  hasValidationErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

  startEditing() {
    if (!this.capturedImageUrl) return;

    this.isEditing = true;
    setTimeout(() => {
      this.initializeCanvas();
    }, 100);
  }

  initializeCanvas() {
    if (!this.canvasElement) return;

    this.canvas = this.canvasElement.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) return;

    this.originalImage = new Image();
    this.originalImage.onload = () => {
      if (!this.canvas || !this.ctx) return;
      this.canvas.width = this.originalImage!.width;
      this.canvas.height = this.originalImage!.height;
      this.ctx.drawImage(this.originalImage!, 0, 0);
      this.setupCanvasEvents();
    };
    // Always use capturedImageUrl if available
    this.originalImage.src = this.capturedImageUrl || this.originalImageUrl!;
  }

  setupCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onMouseDown(e: MouseEvent) {
    this.isDrawing = true;
    const rect = this.canvas!.getBoundingClientRect();
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    this.startX = (e.clientX - rect.left) * scaleX;
    this.startY = (e.clientY - rect.top) * scaleY;
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.ctx) return;

    const rect = this.canvas!.getBoundingClientRect();
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    this.drawRectangle(this.startX, this.startY, currentX - this.startX, currentY - this.startY);
  }

  onMouseUp() {
    this.isDrawing = false;
  }

  onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.isDrawing = true;
    const rect = this.canvas!.getBoundingClientRect();
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const touch = e.touches[0];
    this.startX = (touch.clientX - rect.left) * scaleX;
    this.startY = (touch.clientY - rect.top) * scaleY;
  }

  onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDrawing || !this.ctx) return;

    const rect = this.canvas!.getBoundingClientRect();
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const touch = e.touches[0];
    const currentX = (touch.clientX - rect.left) * scaleX;
    const currentY = (touch.clientY - rect.top) * scaleY;

    this.drawRectangle(this.startX, this.startY, currentX - this.startX, currentY - this.startY);
  }

  onTouchEnd() {
    this.isDrawing = false;
  }

  drawRectangle(x: number, y: number, width: number, height: number) {
    if (!this.ctx || !this.originalImage) return;

    // Check if original image is still valid
    if (this.originalImage.complete && this.originalImage.naturalWidth !== 0) {
      // Clear canvas and redraw original image
      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      this.ctx.drawImage(this.originalImage, 0, 0);

      // Calculate normalized line width based on canvas size
      const normalizedLineWidth = Math.max(3, Math.min(15, this.canvas!.width / 100));

      // Draw rectangle border only
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = normalizedLineWidth;
      this.ctx.strokeRect(x, y, width, height);
    } else {
      // Reload the original image if it's broken
      this.originalImage.src = this.originalImageUrl!;
    }
  }

  clearCanvas() {
    if (!this.ctx || !this.originalImage) return;

    // Check if original image is still valid
    if (this.originalImage.complete && this.originalImage.naturalWidth !== 0) {
      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      this.ctx.drawImage(this.originalImage, 0, 0);
    } else {
      // Reload the original image if it's broken
      this.originalImage.src = this.originalImageUrl!;
    }
  }

  saveEditedImage() {
    if (!this.canvas) return;

    this.canvas.toBlob((blob) => {
      if (blob) {
        // Update the captured image URL with the edited version
        if (this.capturedImageUrl && this.capturedImageUrl !== this.originalImageUrl) {
          URL.revokeObjectURL(this.capturedImageUrl);
        }
        this.capturedImageUrl = URL.createObjectURL(blob);
        this.beforeExecutionImageUrl = this.capturedImageUrl; // Update display URL
        this.form.patchValue({ beforeExecutionImage: blob });
        if (this.fieldErrors['beforeExecutionImage']) {
          delete this.fieldErrors['beforeExecutionImage'];
        }
        this.isEditing = false;
      }
    }, 'image/jpeg', 0.9);
  }

  cancelEditing() {
    this.isEditing = false;
    this.removeCanvasEvents();
  }

  removeCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
} 
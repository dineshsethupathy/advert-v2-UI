import { Component, OnInit, OnDestroy, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BoardsService, Board, CreateBoardRequest, UpdateBoardRequest } from '../../services/boards.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-board-details',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './board-details.component.html',
    styleUrl: './board-details.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BoardDetailsComponent implements OnInit, OnDestroy {
    boards: Board[] = [];
    filteredBoards: Board[] = [];
    loading = false;
    formLoading = false;
    showForm = false;
    editingBoard: Board | null = null;
    errorMessage = '';
    successMessage = '';
    boardForm: FormGroup;
    selectedImage: File | null = null;
    imagePreview: string | null = null;
    formSubmitted = false;
    showImagePreview = false;
    previewImageUrl = '';
    previewImageTitle = '';

    // Individual image loading states
    imageLoadingStates: { [key: number]: boolean } = {};

    private isInitialized = false;

    constructor(
        private http: HttpClient,
        private boardsService: BoardsService,
        private fb: FormBuilder
    ) {
        this.boardForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            brandName: ['', [Validators.required, Validators.minLength(2)]],
            // width: ['', [Validators.required, Validators.min(0.01)]],
            // height: ['', [Validators.required, Validators.min(0.01)]],
            cost: ['', [Validators.min(0)]],
            imageUrl: ['']
        });
    }

    ngOnInit(): void {
        // console.log('BoardDetailsComponent ngOnInit() called');

        // Prevent duplicate initialization
        if (this.isInitialized) {
            console.log('Component already initialized, skipping...');
            return;
        }

        this.isInitialized = true;
        this.loadBoards();
    }

    ngOnDestroy(): void {
        console.log('BoardDetailsComponent ngOnDestroy() called');
        this.isInitialized = false;
    }

    loadBoards(): void {
        // Prevent duplicate calls if already loading
        if (this.loading) {
            // console.log('loadBoards() called while already loading, skipping...');
            return;
        }

        // console.log('loadBoards() called');
        this.loading = true;
        this.boardsService.getBoards().subscribe({
            next: (boards) => {
                // console.log('Boards loaded:', boards.length);
                this.boards = boards;
                this.filteredBoards = [...this.boards];

                // Initialize image loading states for all boards
                boards.forEach(board => {
                    if (board.imageUrl && board.imageUrl.trim() !== '') {
                        this.imageLoadingStates[board.id] = false; // Start as not loaded
                    }
                });

                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading boards:', error);
                this.errorMessage = 'Failed to load boards';
                this.loading = false;
            }
        });
    }

    showAddForm(): void {
        this.editingBoard = null;
        this.boardForm.reset({
            name: '',
            brandName: '',
            cost: '',
            imageUrl: ''
        });
        this.formSubmitted = false;
        this.showForm = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.selectedImage = null;
        this.imagePreview = null;
    }

    showEditForm(board: Board): void {
        this.editingBoard = board;
        this.boardForm.patchValue({
            name: board.name,
            brandName: board.brandName,
            cost: board.cost || '',
            imageUrl: board.imageUrl || ''
        });
        this.formSubmitted = false;
        this.showForm = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.selectedImage = null;
        this.imagePreview = board.imageUrl || null;
    }

    closeForm(): void {
        this.showForm = false;
        this.editingBoard = null;
        this.boardForm.reset({
            name: '',
            brandName: '',
            cost: '',
            imageUrl: ''
        });
        this.formSubmitted = false;
        this.errorMessage = '';
        this.successMessage = '';
        this.selectedImage = null;
        this.imagePreview = null;
    }

    onSubmit(): void {
        this.formSubmitted = true;

        if (this.boardForm.valid) {
            const formData = this.boardForm.value;

            if (this.editingBoard) {
                this.updateBoard(this.editingBoard.id, formData);
            } else {
                this.createBoard(formData);
            }
        } else {
            this.errorMessage = 'Please fill in all required fields correctly';
        }
    }

    createBoard(boardData: CreateBoardRequest): void {
        this.formLoading = true;
        this.boardsService.createBoard(boardData, this.selectedImage || undefined).subscribe({
            next: (newBoard) => {
                this.boards.unshift(newBoard);
                this.filteredBoards = [...this.boards];
                this.closeForm();
                this.formLoading = false;

                Swal.fire({
                    title: 'Success!',
                    text: 'Board created successfully',
                    icon: 'success',
                    confirmButtonColor: '#28a745',
                    timer: 1500,
                    timerProgressBar: true
                });
            },
            error: (error) => {
                console.error('Error creating board:', error);
                // this.errorMessage = 'Failed to create board';
                this.formLoading = false;

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to create board',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    updateBoard(id: number, boardData: any): void {
        this.formLoading = true;

        // If no new image is selected, use the original blob URL from the editing board
        let imageUrlToSend = boardData.imageUrl;
        if (!this.selectedImage && this.editingBoard?.imageUrl) {
            // Extract the original blob URL from the downloadable URL (remove SAS token)
            const url = new URL(this.editingBoard.imageUrl);
            imageUrlToSend = `${url.protocol}//${url.host}${url.pathname}`;
        }

        const updateRequest: UpdateBoardRequest = {
            id: id,
            name: boardData.name,
            brandName: boardData.brandName,
            width: boardData.width || undefined,
            height: boardData.height || undefined,
            cost: boardData.cost,
            imageUrl: imageUrlToSend
        };

        // Send the selected image file if there is one, otherwise send undefined
        const imageFileToSend: File | undefined = this.selectedImage || undefined;

        this.boardsService.updateBoard(id, updateRequest, imageFileToSend).subscribe({
            next: (updatedBoard) => {
                const index = this.boards.findIndex(board => board.id === id);
                if (index !== -1) {
                    this.boards[index] = updatedBoard;
                    this.filteredBoards = [...this.boards];
                }
                this.closeForm();
                this.formLoading = false;

                Swal.fire({
                    title: 'Success!',
                    text: 'Board updated successfully',
                    icon: 'success',
                    confirmButtonColor: '#28a745',
                    timer: 1500,
                    timerProgressBar: true
                });
            },
            error: (error) => {
                console.error('Error updating board:', error);
                this.errorMessage = 'Failed to update board';
                this.formLoading = false;

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to update board',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    deleteBoard(board: Board): void {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${board.name}". This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.onDeleteConfirm(board);
            }
        });
    }

    onDeleteConfirm(board: Board): void {
        this.loading = true;
        this.boardsService.deleteBoard(board.id).subscribe({
            next: () => {
                this.boards = this.boards.filter(b => b.id !== board.id);
                this.filteredBoards = [...this.boards];
                this.loading = false;

                Swal.fire({
                    title: 'Deleted!',
                    text: `Board "${board.name}" has been deleted.`,
                    icon: 'success',
                    confirmButtonColor: '#10da36'
                });
            },
            error: (error) => {
                console.error('Error deleting board:', error);
                this.errorMessage = 'Failed to delete board';
                this.loading = false;

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete board.',
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    onImageSelected(event: any): void {
        const file = event.target.files[0];

        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                this.errorMessage = 'Please select a valid image file (JPG, PNG, GIF)';
                event.target.value = '';
                return;
            }

            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                this.errorMessage = 'File size must be less than 5MB';
                event.target.value = '';
                return;
            }

            this.selectedImage = file;
            this.errorMessage = '';

            // Create preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            this.selectedImage = null;
            this.imagePreview = null;
        }
    }

    uploadImage(): void {
        // This method is no longer needed as image upload is handled during board creation/update
        // Keeping it for backward compatibility but it's not used
        console.log('uploadImage method is deprecated - image upload is now handled during board creation/update');
    }

    clearMessages(): void {
        this.errorMessage = '';
        this.successMessage = '';
    }

    getImageUrl(board: Board): string {
        return board.imageUrl || '';
    }

    formatDimensions(width?: number, height?: number): string {
        if (width && height) {
            return `${width} × ${height}`;
        }
        return 'Dimensions not specified';
    }

    previewImage(board: Board): void {
        if (board.imageUrl && board.imageUrl.trim() !== '') {
            this.previewImageUrl = this.getImageUrl(board);
            this.previewImageTitle = board.name;
            this.showImagePreview = true;
        }
    }

    closeImagePreview(): void {
        this.showImagePreview = false;
        this.previewImageUrl = '';
        this.previewImageTitle = '';
    }

    // Image loading event handlers
    onImageLoad(boardId: number): void {
        this.imageLoadingStates[boardId] = true;
    }

    onImageError(boardId: number): void {
        this.imageLoadingStates[boardId] = true; // Hide loader even on error
        console.error(`Failed to load image for board ${boardId}`);
    }

    isImageLoaded(boardId: number): boolean {
        return this.imageLoadingStates[boardId] === true;
    }

    removeImage(): void {
        this.selectedImage = null;
        this.imagePreview = null;
        this.boardForm.patchValue({ imageUrl: '' });
    }
} 
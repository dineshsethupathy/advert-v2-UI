import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirmation-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirmation-modal.component.html',
    styleUrl: './confirmation-modal.component.css'
})
export class ConfirmationModalComponent {
    @Input() isOpen = false;
    @Input() title = 'Confirm Action';
    @Input() message = 'Are you sure you want to proceed?';
    @Input() confirmText = 'Confirm';
    @Input() cancelText = 'Cancel';
    @Input() confirmButtonClass = 'btn-danger';
    @Input() cancelButtonClass = 'btn-secondary';

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm(): void {
        this.confirm.emit();
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.onCancel();
        }
    }
} 
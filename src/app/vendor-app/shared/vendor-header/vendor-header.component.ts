import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-vendor-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './vendor-header.component.html',
    styleUrl: './vendor-header.component.css'
})
export class VendorHeaderComponent {
    isUserDropdownOpen = false;
    user: any;
    tenant: any;

    constructor(
        private router: Router,
        private authService: AuthService
    ) {
        this.loadUserData();
    }

    loadUserData(): void {
        this.user = this.authService.getUser();
        this.tenant = this.authService.getTenant();
    }

    toggleUserDropdown(): void {
        this.isUserDropdownOpen = !this.isUserDropdownOpen;
    }

    closeUserDropdown(): void {
        this.isUserDropdownOpen = false;
    }

    logout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/vendor-login']);
            },
            error: (error) => {
                console.error('Logout error:', error);
                // Navigate anyway since auth data is cleared
                this.router.navigate(['/vendor-login']);
            }
        });
    }

    goToDashboard(): void {
        this.router.navigate(['/vendor-dashboard']);
    }
} 
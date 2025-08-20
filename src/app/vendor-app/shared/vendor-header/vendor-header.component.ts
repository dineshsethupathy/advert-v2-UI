import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-vendor-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './vendor-header.component.html',
    styleUrl: './vendor-header.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorHeaderComponent {
    isUserDropdownOpen = false;
    user: any;
    tenant: any;
    logoutLoading = false;

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
        this.logoutLoading = true;
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/vendor-login']);
            },
            error: (error) => {
                console.error('Logout error:', error);
                // Navigate anyway since auth data is cleared
                this.router.navigate(['/vendor-login']);
            },
            complete: () => {
                this.logoutLoading = false;
            }
        });
    }

    goToDashboard(): void {
        this.router.navigate(['/vendor-dashboard']);
    }
} 
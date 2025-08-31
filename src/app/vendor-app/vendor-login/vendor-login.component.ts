import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VendorAuthService } from '../../services/vendor-auth.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

interface LoginResponse {
    token: string;
    refreshToken: string;
    user: any;
    tenant: any;
    permissions: any;
}

interface LoginError {
    error?: {
        message?: string;
    };
}

@Component({
    selector: 'app-vendor-login',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './vendor-login.component.html',
    styleUrl: './vendor-login.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VendorLoginComponent {
    loginForm: FormGroup;
    loading = false;
    showPassword = false;
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private vendorAuthService: VendorAuthService,
        private authService: AuthService
    ) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    getTenantColors(): any {
        // Default colors for vendor portal
        return {
            primary: '#006fcf',
            secondary: '#005bb8'
        };
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.errorMessage = '';
        const formData = this.loginForm.value;

        this.vendorAuthService.login(formData).subscribe({
            next: (response: LoginResponse) => {
                this.loading = false;

                // Store authentication data
                this.authService.setToken(response.token);
                this.authService.setRefreshToken(response.refreshToken);
                this.authService.setUser(response.user);
                this.authService.setTenant(response.tenant);
                this.authService.setPermissions(response.permissions);

                this.router.navigate(['/vendor-dashboard']);
            },
            error: (error: LoginError) => {
                this.loading = false;
                console.error('Login error:', error);
                this.errorMessage = error.error?.message || 'Invalid credentials. Please try again.';
            }
        });
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    goToSignup(): void {
        this.router.navigate(['/vendor-signup']);
    }

    forgotPassword(): void {
        Swal.fire({
            icon: 'info',
            title: 'Contact Support',
            text: 'Please contact your brand representative to reset your password.',
            confirmButtonColor: '#3085d6'
        });
    }
} 
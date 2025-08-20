import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

interface TenantColors {
    primary: string;
    secondary: string;
}

interface TenantColorMap {
    [key: string]: TenantColors;
}

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    imports: [CommonModule, ReactiveFormsModule],
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    loading = false;
    errorMessage = '';
    tenantName: string = '';
    tenantSubdomain: string = '';
    showPassword = false;

    constructor(
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngOnInit(): void {
        this.detectTenant();
        this.checkAuthentication();
    }

    private detectTenant(): void {
        const hostname = window.location.hostname;

        // Extract subdomain (e.g., "hatsun" from "hatsun.tonrin.com")
        const parts = hostname.split('.');
        if (parts.length > 2) {
            this.tenantSubdomain = parts[0];
            this.tenantName = this.formatTenantName(this.tenantSubdomain);
        } else {
            // Default tenant for localhost development
            this.tenantSubdomain = 'demo';
            this.tenantName = 'Demo Brand';
        }
    }

    private formatTenantName(subdomain: string): string {
        return subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
    }

    private checkAuthentication(): void {
        if (this.authService.isAuthenticated()) {
            const currentUser = this.authService.getCurrentUserValue();
            if (currentUser?.userType === 'vendor') {
                this.router.navigate(['/vendor-dashboard']);
            } else if (currentUser?.userType === 'brand' || currentUser?.userType === 'distributor') {
                this.router.navigate(['/dashboard']);
            } else {
                // Fallback for unknown user types
                console.warn('Unknown user type:', currentUser?.userType);
                this.router.navigate(['/dashboard']);
            }
        }
    }

    onSubmit(): void {
        if (this.loginForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            const loginRequest: LoginRequest = {
                email: this.loginForm.get('email')?.value,
                password: this.loginForm.get('password')?.value
            };

            // For demo purposes, we'll use a default tenant ID
            // In production, this would be determined by the subdomain
            const tenantId = this.getTenantIdFromSubdomain();

            this.authService.login(loginRequest, tenantId).subscribe({
                next: (response) => {
                    this.loading = false;
                    console.log('Login successful:', response);

                    // Redirect based on user type
                    if (response.user.userType === 'vendor') {
                        this.router.navigate(['/vendor-dashboard']);
                    } else if (response.user.userType === 'brand' || response.user.userType === 'distributor') {
                        this.router.navigate(['/dashboard']);
                    } else {
                        // Fallback for unknown user types
                        console.warn('Unknown user type:', response.user.userType);
                        this.router.navigate(['/dashboard']);
                    }
                },
                error: (error) => {
                    this.loading = false;
                    console.error('Login error:', error);
                    this.errorMessage = this.getErrorMessage(error);
                }
            });
        } else {
            this.markFormGroupTouched();
        }
    }

    private getTenantIdFromSubdomain(): number {
        // In a real app, you'd map subdomains to tenant IDs
        const tenantMap: { [key: string]: number } = {
            'hatsun': 1,
            'demo': 2,
            'default': 1
        };

        return tenantMap[this.tenantSubdomain] || 1;
    }

    private getErrorMessage(error: any): string {
        if (error.status === 401) {
            return 'Invalid email or password. Please try again.';
        } else if (error.status === 403) {
            return 'Access denied. Please contact your administrator.';
        } else if (error.status === 0) {
            return 'Unable to connect to the server. Please check your internet connection.';
        } else {
            return 'An error occurred during login. Please try again.';
        }
    }

    private markFormGroupTouched(): void {
        Object.keys(this.loginForm.controls).forEach(key => {
            const control = this.loginForm.get(key);
            control?.markAsTouched();
        });
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    getTenantColors(): TenantColors {
        const colors: TenantColorMap = {
            'hatsun': { primary: '#006fcf', secondary: '#005bb8' },
            'demo': { primary: '#006fcf', secondary: '#005bb8' },
            'default': { primary: '#006fcf', secondary: '#005bb8' }
        };

        return colors[this.tenantSubdomain] || colors['default'];
    }

    // Form getters for easy access in template
    get email() { return this.loginForm.get('email'); }
    get password() { return this.loginForm.get('password'); }
} 
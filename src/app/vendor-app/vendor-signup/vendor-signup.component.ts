import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorAuthService } from '../../services/vendor-auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor-signup',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './vendor-signup.component.html',
    styleUrl: './vendor-signup.component.css'
})
export class VendorSignupComponent implements OnInit {
    signupForm: FormGroup;
    loading = false;
    email: string = '';
    tenant: string = '';
    isValidInvitation = false;
    checkingInvitation = true;
    submitted = false;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private vendorAuthService: VendorAuthService
    ) {
        this.signupForm = this.fb.group({
            email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.email = params['email'] || '';
            this.tenant = params['tenant'] || '';

            if (this.email) {
                this.signupForm.patchValue({ email: this.email });
                this.validateInvitation();
            } else {
                this.checkingInvitation = false;
            }
        });
    }

    validateInvitation(): void {
        this.vendorAuthService.validateSignup(this.email).subscribe({
            next: (isValid) => {
                this.isValidInvitation = isValid;
                this.checkingInvitation = false;

                if (!this.isValidInvitation) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Invitation',
                        text: 'This invitation link is invalid or has already been used.',
                        confirmButtonColor: '#3085d6'
                    }).then(() => {
                        this.router.navigate(['/vendor-login']);
                    });
                }
            },
            error: (error) => {
                console.error('Error validating invitation:', error);
                this.checkingInvitation = false;
                this.isValidInvitation = false;
            }
        });
    }

    passwordMatchValidator(form: FormGroup): { [key: string]: any } | null {
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            return { passwordMismatch: true };
        }
        return null;
    }

    onSubmit(): void {
        this.submitted = true;

        if (this.signupForm.invalid) {
            return;
        }

        this.loading = true;
        const formData = this.signupForm.getRawValue(); // Use getRawValue() to include disabled controls

        this.vendorAuthService.signup(formData).subscribe({
            next: (vendor) => {
                this.loading = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Account Created Successfully!',
                    html: `
                        <div style="text-align: center; padding: 20px 0;">
                            
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 25px; line-height: 1.4;">
                                You can now log in with your email and password to access your dashboard.
                            </div>
                            <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
                                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Redirecting to login page in:</div>
                                <div style="font-size: 24px; font-weight: 600; color: #10b981;" id="countdown">5</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-custom-popup',
                        container: 'swal2-custom-container'
                    },
                    didOpen: () => {
                        // Start countdown
                        let countdown = 5;
                        const countdownElement = document.getElementById('countdown');
                        const interval = setInterval(() => {
                            countdown--;
                            if (countdownElement) {
                                countdownElement.textContent = countdown.toString();
                            }
                            if (countdown <= 0) {
                                clearInterval(interval);
                                Swal.close();
                                this.router.navigate(['/vendor-login']);
                            }
                        }, 1000);
                    }
                });
            },
            error: (error) => {
                this.loading = false;
                console.error('Error during signup:', error);
                const errorMessage = error.error?.message || 'An error occurred during signup. Please try again.';
                Swal.fire({
                    icon: 'error',
                    title: 'Signup Failed',
                    text: errorMessage,
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    onPhoneNumberInput(event: any): void {
        const input = event.target;
        let value = input.value;

        // Remove any non-digit characters
        value = value.replace(/\D/g, '');

        // Limit to 10 digits
        if (value.length > 10) {
            value = value.substring(0, 10);
        }

        // Update the input value
        input.value = value;

        // Update the form control
        this.signupForm.patchValue({ phoneNumber: value });
    }

    goToLogin(): void {
        this.router.navigate(['/vendor-login']);
    }
} 
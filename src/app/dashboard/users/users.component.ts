import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { RoleService, Role } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './users.component.html',
    styleUrl: './users.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UsersComponent implements OnInit {
    users: User[] = [];
    roles: Role[] = [];
    loading = false;
    showAddModal = false;
    editingUser: User | null = null;
    formSubmitted = false;
    isRoleDropdownOpen = false;

    userForm: FormGroup;

    constructor(
        private userService: UserService,
        private roleService: RoleService,
        private authService: AuthService,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.userForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            roleId: ['', [Validators.required]]
        });
    }

    ngOnInit(): void {
        this.loadUsers();
        this.loadRoles();
    }

    loadUsers(): void {
        this.loading = true;
        this.userService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading users:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load users. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    loadRoles(): void {
        this.roleService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles;
            },
            error: (error) => {
                console.error('Error loading roles:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load roles. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    showAddUserModal(): void {
        this.editingUser = null;
        this.userForm.reset();
        this.formSubmitted = false;
        this.isRoleDropdownOpen = false;
        this.showAddModal = true;
    }

    showEditUserModal(user: User): void {
        this.editingUser = user;
        this.formSubmitted = false;
        this.isRoleDropdownOpen = false;
        this.userForm.patchValue({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId
        });
        this.showAddModal = true;
    }

    closeModal(): void {
        this.showAddModal = false;
        this.editingUser = null;
        this.formSubmitted = false;
        this.isRoleDropdownOpen = false;
        this.userForm.reset();
    }

    onSubmit(): void {
        this.formSubmitted = true;
        if (this.userForm.valid) {
            const formData = this.userForm.value;

            if (this.editingUser) {
                // Update user (password not included in update)
                const updateRequest = {
                    id: this.editingUser.id,
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    roleId: formData.roleId
                };

                this.userService.updateUser(updateRequest).subscribe({
                    next: (updatedUser) => {
                        const index = this.users.findIndex(u => u.id === updatedUser.id);
                        if (index !== -1) {
                            this.users[index] = updatedUser;
                        }
                        this.closeModal();
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'User updated successfully',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error updating user:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to update user. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            } else {
                // Create new user
                const createRequest: CreateUserRequest = {
                    email: formData.email,
                    password: null, // Password will be set by user on first login
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    roleId: formData.roleId
                };

                this.userService.createUser(createRequest).subscribe({
                    next: (newUser) => {
                        this.users.unshift(newUser);
                        this.closeModal();
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'User created successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error creating user:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to create user. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please fill in all required fields correctly.',
                confirmButtonColor: '#3085d6'
            });
        }
    }

    deleteUser(user: User): void {
        Swal.fire({
            title: 'Delete User',
            text: `Are you sure you want to delete "${user.firstName} ${user.lastName}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.deleteUser(user.id).subscribe({
                    next: () => {
                        this.users = this.users.filter(u => u.id !== user.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'User has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting user:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete user. Please try again.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    navigateToRoles(): void {
        this.router.navigate(['/roles']);
    }

    getRoleName(roleId: number): string {
        const role = this.roles.find(r => r.id === roleId);
        return role ? role.name : 'Unknown Role';
    }

    getFormTitle(): string {
        return this.editingUser ? 'Edit User' : 'Add New User';
    }

    getSubmitButtonText(): string {
        return this.editingUser ? 'Update User' : 'Create User';
    }



    // Custom dropdown methods
    toggleRoleDropdown(): void {
        this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
    }

    selectRole(roleId: number, roleName: string, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        this.userForm.patchValue({ roleId: roleId });
        this.isRoleDropdownOpen = false;
    }

    getSelectedRoleText(): string {
        const selectedRoleId = this.userForm.get('roleId')?.value;
        if (!selectedRoleId) {
            return 'Select a role';
        }
        const selectedRole = this.roles.find(role => role.id === selectedRoleId);
        return selectedRole ? selectedRole.name : 'Select a role';
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Close role dropdown if clicked outside
        if (!target.closest('.custom-select')) {
            this.isRoleDropdownOpen = false;
        }
    }
} 
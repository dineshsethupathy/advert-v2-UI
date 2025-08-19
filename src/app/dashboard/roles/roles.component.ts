import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RoleService, Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './roles.component.html',
    styleUrl: './roles.component.css'
})
export class RolesComponent implements OnInit {
    roles: Role[] = [];
    permissions: Permission[] = [];
    loading = false;
    showAddModal = false;
    editingRole: Role | null = null;

    roleForm: FormGroup;

    constructor(
        private roleService: RoleService,
        private authService: AuthService,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.roleForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.loadRoles();
        this.loadPermissions();
    }

    loadRoles(): void {
        this.loading = true;
        this.roleService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading roles:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load roles. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    loadPermissions(): void {
        this.roleService.getAllPermissions().subscribe({
            next: (permissions) => {
                this.permissions = permissions;
            },
            error: (error) => {
                console.error('Error loading permissions:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load permissions. Please try again.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    showAddRoleModal(): void {
        this.editingRole = null;
        this.roleForm.reset();
        this.showAddModal = true;
    }

    showEditRoleModal(role: Role): void {
        this.editingRole = role;
        this.roleForm.patchValue({
            name: role.name,
            description: role.description
        });
        this.showAddModal = true;
    }



    closeModal(): void {
        this.showAddModal = false;
        this.editingRole = null;
        this.roleForm.reset();
    }

    onSubmit(): void {
        if (this.roleForm.valid) {
            const formData = this.roleForm.value;

            if (this.editingRole) {
                // Update role
                const updateRequest: UpdateRoleRequest = {
                    id: this.editingRole.id,
                    name: formData.name,
                    description: formData.description
                };

                this.roleService.updateRole(updateRequest).subscribe({
                    next: (updatedRole) => {
                        const index = this.roles.findIndex(r => r.id === updatedRole.id);
                        if (index !== -1) {
                            this.roles[index] = updatedRole;
                        }

                        this.closeModal();
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'Role updated successfully',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error updating role:', error);
                        let errorMessage = 'Failed to update role. Please try again.';
                        let showStyledError = false;

                        // Check if the error is about role name already existing
                        if (error.error && typeof error.error === 'string' &&
                            error.error.includes('Role name already exists')) {
                            errorMessage = 'Role name already exists';
                            showStyledError = true;
                        }

                        if (showStyledError) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Role Name Exists',
                                html: `
                                    <div style="text-align: left; padding: 10px 0;">
                                        <p style="margin: 0 0 15px 0; color: #d32f2f; font-weight: 500;">
                                            <span style="display: inline-block; margin-right: 8px;">⚠️</span>
                                            Role name already exists.
                                        </p>
                                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin-top: 10px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.4;">
                                                <strong>What you can do:</strong>
                                            </p>
                                            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #856404; font-size: 13px; line-height: 1.4;">
                                                <li>Choose a different role name</li>
                                                <li>Use a more specific or unique name</li>
                                            </ul>
                                        </div>
                                    </div>
                                `,
                                confirmButtonColor: '#3085d6',
                                confirmButtonText: 'Got it',
                                width: '500px'
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: errorMessage,
                                confirmButtonColor: '#3085d6'
                            });
                        }
                    }
                });
            } else {
                // Create new role
                const createRequest: CreateRoleRequest = {
                    name: formData.name,
                    description: formData.description,
                    permissionIds: []
                };

                this.roleService.createRole(createRequest).subscribe({
                    next: (newRole) => {
                        this.roles.unshift(newRole);
                        this.closeModal();
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'Role created successfully',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error creating role:', error);
                        let errorMessage = 'Failed to create role. Please try again.';
                        let showStyledError = false;

                        // Check if the error is about role name already existing
                        if (error.error && typeof error.error === 'string' &&
                            error.error.includes('Role name already exists')) {
                            errorMessage = 'Role name already exists';
                            showStyledError = true;
                        }

                        if (showStyledError) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Role Name Exists',
                                html: `
                                    <div style="text-align: left; padding: 10px 0;">
                                        <p style="margin: 0 0 15px 0; color: #d32f2f; font-weight: 500;">
                                            <span style="display: inline-block; margin-right: 8px;">⚠️</span>
                                            Role name already exists.
                                        </p>
                                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin-top: 10px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.4;">
                                                <strong>What you can do:</strong>
                                            </p>
                                            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #856404; font-size: 13px; line-height: 1.4;">
                                                <li>Choose a different role name</li>
                                                <li>Use a more specific or unique name</li>
                                            </ul>
                                        </div>
                                    </div>
                                `,
                                confirmButtonColor: '#3085d6',
                                confirmButtonText: 'Got it',
                                width: '500px'
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: errorMessage,
                                confirmButtonColor: '#3085d6'
                            });
                        }
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



    deleteRole(role: Role): void {
        Swal.fire({
            title: 'Delete Role',
            text: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.roleService.deleteRole(role.id).subscribe({
                    next: () => {
                        this.roles = this.roles.filter(r => r.id !== role.id);
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Role has been deleted successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting role:', error);
                        let errorMessage = 'Failed to delete role. Please try again.';

                        // Check if the error is about role being assigned to users
                        if (error.error && typeof error.error === 'string' &&
                            error.error.includes('Cannot delete role that is assigned to users')) {
                            errorMessage = 'Cannot delete role that is assigned to users. Please reassign or remove users from this role first.';
                        }

                        Swal.fire({
                            icon: 'error',
                            title: 'Cannot Delete Role',
                            html: `
                                <div style="text-align: left; padding: 10px 0;">
                                    <p style="margin: 0 0 15px 0; color: #d32f2f; font-weight: 500;">
                                        <span style="display: inline-block; margin-right: 8px;">⚠️</span>
                                        Cannot delete role that is assigned to users.
                                    </p>
                                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin-top: 10px;">
                                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.4;">
                                            <strong>What you can do:</strong>
                                        </p>
                                        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #856404; font-size: 13px; line-height: 1.4;">
                                            <li>Reassign users to a different role first</li>
                                            <li>Remove users from this role</li>
                                            <li>Then try deleting the role again</li>
                                        </ul>
                                    </div>
                                </div>
                            `,
                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'Got it',
                            width: '500px'
                        });
                    }
                });
            }
        });
    }

    navigateToUsers(): void {
        this.router.navigate(['/users']);
    }

    getUsersCount(role: Role): number {
        return role.userCount;
    }

    getFormTitle(): string {
        return this.editingRole ? 'Edit Role' : 'Add New Role';
    }

    getSubmitButtonText(): string {
        return this.editingRole ? 'Update Role' : 'Create Role';
    }


} 
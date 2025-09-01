import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { RoleService, Role } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { RegionService, Region } from '../../services/region.service';

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
    regions: Region[] = [];
    loading = false;
    submitting = false;
    showAddModal = false;
    showRegionsModalFlag = false;
    editingUser: User | null = null;
    selectedUserForRegions: User | null = null;
    formSubmitted = false;
    isRoleDropdownOpen = false;
    isRegionDropdownOpen = false;
    selectedRegionFilters: number[] = [];

    userForm: FormGroup;

    constructor(
        private userService: UserService,
        private roleService: RoleService,
        private regionService: RegionService,
        private authService: AuthService,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.userForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            roleId: ['', [Validators.required]],
            regionIds: [[]]
        });
    }

    ngOnInit(): void {
        this.loadUsers();
        this.loadRolesAndRegions();
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

    loadRolesAndRegions(): void {
        this.roleService.getRolesAndRegions().subscribe({
            next: (response) => {
                this.roles = response.roles;
                this.regions = response.regions;
            },
            error: (error) => {
                console.error('Error loading roles and regions:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load roles and regions. Please try again.',
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
        this.isRegionDropdownOpen = false;

        // Parse regions string to array of IDs
        const regionIds = user.regions ?
            user.regions.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) :
            [];

        this.userForm.patchValue({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            regionIds: regionIds
        });
        this.showAddModal = true;
    }

    closeModal(): void {
        this.showAddModal = false;
        this.editingUser = null;
        this.formSubmitted = false;
        this.submitting = false;
        this.isRoleDropdownOpen = false;
        this.isRegionDropdownOpen = false;
        this.userForm.reset();
    }

    onSubmit(): void {
        this.formSubmitted = true;
        if (this.userForm.valid) {
            this.submitting = true;
            const formData = this.userForm.value;

            if (this.editingUser) {
                // Update user (password not included in update)
                const updateRequest = {
                    id: this.editingUser.id,
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    roleId: formData.roleId,
                    regionIds: formData.regionIds
                };

                this.userService.updateUser(updateRequest).subscribe({
                    next: (updatedUser) => {
                        const index = this.users.findIndex(u => u.id === updatedUser.id);
                        if (index !== -1) {
                            this.users[index] = updatedUser;
                        }
                        this.closeModal();
                        this.submitting = false;
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'User updated successfully',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error updating user:', error);
                        this.submitting = false;
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
                    roleId: formData.roleId,
                    regionIds: formData.regionIds
                };

                this.userService.createUser(createRequest).subscribe({
                    next: (newUser) => {
                        this.users.unshift(newUser);
                        this.closeModal();
                        this.submitting = false;
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'User created successfully.',
                            confirmButtonColor: '#3085d6'
                        });
                    },
                    error: (error) => {
                        console.error('Error creating user:', error);
                        this.submitting = false;
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

        // Close region dropdown if clicked outside
        if (!target.closest('.multi-select-dropdown')) {
            this.isRegionDropdownOpen = false;
        }
    }

    // Region dropdown methods
    toggleRegionDropdown(): void {
        this.isRegionDropdownOpen = !this.isRegionDropdownOpen;
    }

    onRegionChange(regionId: number, checked: boolean): void {
        const currentRegionIds = this.userForm.get('regionIds')?.value || [];

        if (checked) {
            if (!currentRegionIds.includes(regionId)) {
                this.userForm.patchValue({ regionIds: [...currentRegionIds, regionId] });
            }
        } else {
            this.userForm.patchValue({
                regionIds: currentRegionIds.filter((id: number) => id !== regionId)
            });
        }
    }

    isRegionSelected(regionId: number): boolean {
        const currentRegionIds = this.userForm.get('regionIds')?.value || [];
        return currentRegionIds.includes(regionId);
    }

    getSelectedRegionsText(): string {
        const selectedRegionIds = this.userForm.get('regionIds')?.value || [];
        if (selectedRegionIds.length === 0) {
            return 'Select regions';
        } else if (selectedRegionIds.length === 1) {
            const region = this.regions.find(r => r.id === selectedRegionIds[0]);
            return region?.name || 'Unknown Region';
        } else {
            return `${selectedRegionIds.length} regions selected`;
        }
    }

    getUserRegionIds(regionsString?: string): number[] {
        if (!regionsString || regionsString.trim() === '') {
            return [];
        }
        return regionsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    getRegionName(regionId: number): string {
        const region = this.regions.find(r => r.id === regionId);
        return region ? region.name : 'Unknown Region';
    }

    getUserRegionsCount(regionsString?: string): number {
        if (!regionsString || regionsString.trim() === '') {
            return 0;
        }
        return regionsString.split(',').filter(id => !isNaN(parseInt(id.trim()))).length;
    }

    showRegionsModal(user: User): void {
        this.selectedUserForRegions = user;
        this.showRegionsModalFlag = true;
    }

    closeRegionsModal(): void {
        this.showRegionsModalFlag = false;
        this.selectedUserForRegions = null;
    }
} 
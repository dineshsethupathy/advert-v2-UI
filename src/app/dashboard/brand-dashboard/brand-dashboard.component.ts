import { Component, OnInit, HostListener, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { DashboardService, DashboardStats, RecentActivity, Assignment, User, Store } from '../../services/dashboard.service';
import { DashboardAnalyticsService, DashboardAnalytics } from '../../services/dashboard-analytics.service';
import { RegionComponent } from '../region/region.component';
import { VendorComponent } from '../vendor/vendor.component';
import { DistributorComponent } from '../distributor/distributor.component';
import { ShopOutletsComponent } from '../shop-outlets/shop-outlets.component';
import { BoardDetailsComponent } from '../board-details/board-details.component';
import { UsersComponent } from '../users/users.component';
import { RolesComponent } from '../roles/roles.component';
import { AssignmentsComponent } from '../assignments/assignments.component';
import { CreateAssignmentComponent } from '../assignments/create-assignment/create-assignment.component';
import { ViewAssignmentComponent } from '../assignments/view-assignment/view-assignment.component';
import { WorkflowsComponent } from '../workflows/workflows.component';
import { CreateWorkflowComponent } from '../workflows/create-workflow/create-workflow.component';
import { ViewWorkflowComponent } from '../workflows/view-workflow/view-workflow.component';
import { BrandUserStoreViewComponent } from '../branduser-store-view/branduser-store-view.component';

interface SidebarItem {
    name: string;
    icon: string;
    route: string;
    active: boolean;
    visible: boolean;
}

@Component({
    selector: 'app-brand-dashboard',
    standalone: true,
    imports: [CommonModule, RegionComponent, VendorComponent, DistributorComponent, ShopOutletsComponent, BoardDetailsComponent, UsersComponent, RolesComponent, AssignmentsComponent, CreateAssignmentComponent, ViewAssignmentComponent, WorkflowsComponent, CreateWorkflowComponent, ViewWorkflowComponent, BrandUserStoreViewComponent],
    templateUrl: './brand-dashboard.component.html',
    styleUrl: './brand-dashboard.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BrandDashboardComponent implements OnInit, OnDestroy {
    sidebarItems: SidebarItem[] = [
        { name: 'Home', icon: 'home', route: '/dashboard', active: false, visible: true },
        { name: 'Assignments', icon: 'assignment', route: '/assignments', active: false, visible: true },
        { name: 'Users', icon: 'people', route: '/users', active: false, visible: true },
        { name: 'Shop Outlets', icon: 'store', route: '/shop-outlets', active: false, visible: true },
        { name: 'Region', icon: 'public', route: '/region', active: false, visible: true },
        { name: 'Vendors', icon: 'business', route: '/vendors', active: false, visible: true },
        { name: 'Distributors', icon: 'local_shipping', route: '/distributors', active: false, visible: true },
        { name: 'Board Details', icon: 'dashboard', route: '/board-details', active: false, visible: true }
    ];

    selectedItem: SidebarItem | null = null;
    currentUser: CurrentUser | null = null;
    dashboardStats: DashboardStats | null = null;
    dashboardAnalytics: DashboardAnalytics | null = null;
    recentActivities: RecentActivity[] = [];
    assignments: Assignment[] = [];
    users: User[] = [];
    stores: Store[] = [];
    loading = false;
    logoutLoading = false;
    showProfileMenu = false;
    currentRoute = '/dashboard';
    isSidebarCollapsed = false;
    private routeSubscription: any;

    constructor(
        private router: Router,
        private authService: AuthService,
        private dashboardService: DashboardService,
        private dashboardAnalyticsService: DashboardAnalyticsService
    ) { }

    ngOnInit(): void {
        this.loadCurrentUser();

        // Initialize currentRoute with the actual current URL
        this.currentRoute = this.router.url;
        console.log('Initial route:', this.currentRoute);
        this.updateActiveItem();

        // Restore sidebar state from localStorage
        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState !== null) {
            this.isSidebarCollapsed = savedSidebarState === 'true';
        }

        // Only load dashboard data if we're on the dashboard page
        if (this.currentRoute === '/dashboard') {
            this.loadDashboardData();
        }

        // Subscribe to route changes to update active item
        this.routeSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event) => {
                if (event instanceof NavigationEnd) {
                    this.currentRoute = event.url;
                    // console.log('Route changed to:', this.currentRoute);
                    this.updateActiveItem();

                    // Load dashboard data only when navigating to dashboard
                    if (this.currentRoute === '/dashboard') {
                        this.loadDashboardData();
                    }
                }
            });
    }

    loadCurrentUser(): void {
        this.currentUser = this.authService.getCurrentUserValue();
        // console.log('Loaded current user:', this.currentUser);
        if (!this.currentUser) {
            this.router.navigate(['/login']);
            return;
        }

        this.updateSidebarVisibility();
    }

    updateSidebarVisibility(): void {
        // Show/hide sidebar items based on user type
        if (this.currentUser) {
            // console.log('Current user type:', this.currentUser.userType);
            // console.log('Current user:', this.currentUser);

            this.sidebarItems.forEach(item => {
                // For now, show all items for all user types
                // TODO: Implement proper role-based visibility later
                item.visible = true;

                // Uncomment below for role-based filtering when needed
                /*
                switch (this.currentUser!.userType) {
                    case 'Brand':
                    case 'brand':
                        item.visible = true;
                        break;
                    case 'Vendor':
                    case 'vendor':
                        item.visible = ['Home', 'Assignments'].includes(item.name);
                        break;
                    case 'Distributor':
                    case 'distributor':
                        item.visible = ['Home', 'Assignments', 'Shop Outlets'].includes(item.name);
                        break;
                    default:
                        item.visible = true; // Show all by default
                }
                */

                // console.log(`Item ${item.name}: visible = ${item.visible}`);
            });
        } else {
            // If no user, show all items
            this.sidebarItems.forEach(item => {
                item.visible = true;
            });
        }
    }

    loadDashboardData(): void {
        this.loading = true;

        // Load basic dashboard stats
        // this.dashboardService.getStats().subscribe({
        //     next: (stats) => {
        //         this.dashboardStats = stats;
        //         console.log('Loaded dashboard stats:', stats);
        //     },
        //     error: (error) => {
        //         console.error('Error loading dashboard stats:', error);
        //     }
        // });

        // Load enhanced analytics
        this.dashboardAnalyticsService.getDashboardAnalytics().subscribe({
            next: (analytics) => {
                this.dashboardAnalytics = analytics;
                // console.log('Loaded dashboard analytics:', analytics);
                this.loading = false;
            },
            error: (error) => {
                // console.error('Error loading dashboard analytics:', error);
                this.loading = false;
            }
        });

        // Load recent activities
        // this.dashboardService.getRecentActivity(5).subscribe({
        //     next: (activities) => {
        //         this.recentActivities = activities;
        //         console.log('Loaded recent activities:', activities);
        //     },
        //     error: (error) => {
        //         console.error('Error loading recent activities:', error);
        //     }
        // });

        // Load assignments
        this.dashboardService.getAssignments().subscribe({
            next: (assignments) => {
                this.assignments = assignments;
                // console.log('Loaded assignments:', assignments);
            },
            error: (error) => {
                console.error('Error loading assignments:', error);
            }
        });

        // Load users
        this.dashboardService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                // console.log('Loaded users:', users);
            },
            error: (error) => {
                console.error('Error loading users:', error);
            }
        });

        // Load stores
        this.dashboardService.getStores().subscribe({
            next: (stores) => {
                this.stores = stores;
                // console.log('Loaded stores:', stores);
            },
            error: (error) => {
                console.error('Error loading stores:', error);
            }
        });
    }

    selectItem(item: SidebarItem): void {
        this.selectedItem = item;
        this.router.navigate([item.route]);
    }

    logout(): void {
        this.logoutLoading = true;
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/login']);
            },
            error: (error) => {
                console.error('Logout error:', error);
                this.logoutLoading = false;
            }
        });
    }

    toggleSidebar(): void {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        // Save state to localStorage for persistence
        localStorage.setItem('sidebarCollapsed', this.isSidebarCollapsed.toString());
    }

    getCurrentUserName(): string {
        return this.currentUser ? `${this.currentUser.email}` : 'User';
    }

    getTenantName(): string {
        return this.currentUser?.tenantName || 'Brand Dashboard';
    }

    getUserType(): string {
        return this.currentUser?.userType || 'User';
    }

    getCurrentUserEmail(): string {
        return this.currentUser?.email || 'user@example.com';
    }

    getVisibleSidebarItems(): SidebarItem[] {
        return this.sidebarItems.filter(item => item.visible);
    }

    toggleProfileMenu(): void {
        this.showProfileMenu = !this.showProfileMenu;
    }

    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.profile-dropdown')) {
            this.showProfileMenu = false;
        }
    }

    updateActiveItem(): void {
        this.sidebarItems.forEach(item => {
            // Reset all items to inactive
            item.active = false;
        });

        // Handle special route mappings
        let activeItemName: string | null = null;

        if (this.currentRoute === '/dashboard') {
            activeItemName = 'Home';
        } else if (this.currentRoute === '/assignments' || this.currentRoute.startsWith('/assignments/')) {
            activeItemName = 'Assignments';
        } else if (this.currentRoute === '/users') {
            activeItemName = 'Users';
        } else if (this.currentRoute === '/shop-outlets') {
            activeItemName = 'Shop Outlets';
        } else if (this.currentRoute === '/region') {
            activeItemName = 'Region';
        } else if (this.currentRoute === '/vendors') {
            activeItemName = 'Vendors';
        } else if (this.currentRoute === '/distributors') {
            activeItemName = 'Distributors';
        } else if (this.currentRoute === '/board-details') {
            activeItemName = 'Board Details';
        } else if (this.currentRoute === '/workflows' || this.currentRoute.startsWith('/workflows/')) {
            // Workflows should highlight Assignments in sidebar
            activeItemName = 'Assignments';
        } else if (this.currentRoute.includes('/store-view/')) {
            // Store view should highlight Assignments in sidebar
            activeItemName = 'Assignments';
        } else if (this.currentRoute === '/roles') {
            // Roles should highlight Users in sidebar
            activeItemName = 'Users';
        }

        // Set the active item
        if (activeItemName) {
            const activeItem = this.sidebarItems.find(item => item.name === activeItemName);
            if (activeItem) {
                activeItem.active = true;
            }
        }
    }

    // Helper methods for safe navigation
    navigateToAssignments(): void {
        const assignmentsItem = this.sidebarItems.find(item => item.name === 'Assignments');
        if (assignmentsItem) {
            this.selectItem(assignmentsItem);
        }
    }

    navigateToShopOutlets(): void {
        const shopOutletsItem = this.sidebarItems.find(item => item.name === 'Shop Outlets');
        if (shopOutletsItem) {
            this.selectItem(shopOutletsItem);
        }
    }

    navigateToVendors(): void {
        const vendorsItem = this.sidebarItems.find(item => item.name === 'Vendors');
        if (vendorsItem) {
            this.selectItem(vendorsItem);
        }
    }

    @HostListener('document:click', ['$event'])
    handleDocumentClick(event: Event): void {
        this.onDocumentClick(event);
    }

    ngOnDestroy(): void {
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
} 
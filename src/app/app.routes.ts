import { Routes } from '@angular/router';
import { BrandDashboardComponent } from './dashboard/brand-dashboard/brand-dashboard.component';
import { RegionComponent } from './dashboard/region/region.component';
import { UsersComponent } from './dashboard/users/users.component';
import { RolesComponent } from './dashboard/roles/roles.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { AssignmentsComponent } from './dashboard/assignments/assignments.component';
import { CreateAssignmentComponent } from './dashboard/assignments/create-assignment/create-assignment.component';
import { ViewAssignmentComponent } from './dashboard/assignments/view-assignment/view-assignment.component';
import { WorkflowsComponent } from './dashboard/workflows/workflows.component';
import { CreateWorkflowComponent } from './dashboard/workflows/create-workflow/create-workflow.component';
import { ViewWorkflowComponent } from './dashboard/workflows/view-workflow/view-workflow.component';
import { VendorSignupComponent } from './vendor-app/vendor-signup/vendor-signup.component';
import { VendorLoginComponent } from './vendor-app/vendor-login/vendor-login.component';
import { VendorDashboardComponent } from './vendor-app/vendor-dashboard/vendor-dashboard.component';
import { VendorAssignmentViewComponent } from './vendor-app/vendor-assignment-view/vendor-assignment-view.component';
import { VendorStoreEditComponent } from './vendor-app/vendor-store-edit/vendor-store-edit.component';
import { VendorStoreViewComponent } from './vendor-app/vendor-store-view/vendor-store-view.component';
import { StoreWorkflowViewComponent } from './dashboard/assignments/store-workflow-view/store-workflow-view.component';
import { BrandUserStoreViewComponent } from './dashboard/branduser-store-view/branduser-store-view.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'assignments', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'assignments/create', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'assignments/:assignmentId/stores/:storeAssignmentId/workflow', component: StoreWorkflowViewComponent, canActivate: [AuthGuard] },
    { path: 'dashboard/store-view/:id', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'assignments/:id/edit', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'assignments/:id', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'workflows', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'workflows/create', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'workflows/:id', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'workflows/:id/edit', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'users', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'roles', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'shop-outlets', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'region', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'vendors', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'distributors', component: BrandDashboardComponent, canActivate: [AuthGuard] },
    { path: 'board-details', component: BrandDashboardComponent, canActivate: [AuthGuard] },

    // Vendor App Routes
    { path: 'vendor-signup', component: VendorSignupComponent },
    { path: 'vendor-login', component: VendorLoginComponent },
    { path: 'vendor-dashboard', component: VendorDashboardComponent, canActivate: [AuthGuard] },
    { path: 'vendor-assignments/:id', component: VendorAssignmentViewComponent, canActivate: [AuthGuard] },
    { path: 'vendor-store-edit/:id', component: VendorStoreEditComponent, canActivate: [AuthGuard] },
    { path: 'vendor-store-view/:id', component: VendorStoreViewComponent, canActivate: [AuthGuard] },

    { path: '**', redirectTo: '/login' }
];

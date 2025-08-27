import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
    private storedRoutes = new Map<string, DetachedRouteHandle>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        // Always detach BrandDashboardComponent routes
        return true;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        const key = this.getRouteKey(route);
        this.storedRoutes.set(key, handle);
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        const key = this.getRouteKey(route);
        return this.storedRoutes.has(key);
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        const key = this.getRouteKey(route);
        return this.storedRoutes.get(key) || null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        // Always reuse BrandDashboardComponent routes
        return true;
    }

    private getRouteKey(route: ActivatedRouteSnapshot): string {
        // Use a consistent key for all BrandDashboardComponent routes
        return 'brand-dashboard';
    }
}

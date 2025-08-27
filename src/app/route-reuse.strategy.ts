import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
    private storedRoutes = new Map<string, DetachedRouteHandle>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        // Be very conservative - only detach if explicitly needed
        return false;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        // Don't store anything for now
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        // Don't attach anything for now
        return false;
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        // Don't retrieve anything for now
        return null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        // Only reuse if it's the exact same route with same parameters
        if (future.routeConfig?.path !== curr.routeConfig?.path) {
            return false;
        }

        // Check if parameters are the same
        const futureParams = future.params;
        const currParams = curr.params;

        if (Object.keys(futureParams).length !== Object.keys(currParams).length) {
            return false;
        }

        for (const key in futureParams) {
            if (futureParams[key] !== currParams[key]) {
                return false;
            }
        }

        return true;
    }
}

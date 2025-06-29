import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false; // Do not detach routes
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    // No-op: Do not store routes
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return false; // Do not reattach routes
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return null; // No routes to retrieve
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && !future.data['alwaysRefresh'];
  }
}
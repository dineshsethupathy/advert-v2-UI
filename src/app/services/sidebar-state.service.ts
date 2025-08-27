import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SidebarStateService {
    private isCollapsedSubject = new BehaviorSubject<boolean>(false);
    private isReadySubject = new BehaviorSubject<boolean>(false);

    isCollapsed$ = this.isCollapsedSubject.asObservable();
    isReady$ = this.isReadySubject.asObservable();

    constructor() {
        // Restore state immediately and synchronously
        const savedState = localStorage.getItem('sidebarCollapsed');
        const collapsed = savedState === 'true';

        // Set state immediately
        this.isCollapsedSubject.next(collapsed);

        // Mark as ready after state is set
        setTimeout(() => {
            this.isReadySubject.next(true);
        }, 0);
    }

    toggleSidebar(): void {
        const currentState = this.isCollapsedSubject.value;
        const newState = !currentState;
        this.isCollapsedSubject.next(newState);
        localStorage.setItem('sidebarCollapsed', newState.toString());
    }

    setCollapsed(collapsed: boolean): void {
        this.isCollapsedSubject.next(collapsed);
        localStorage.setItem('sidebarCollapsed', collapsed.toString());
    }

    getCurrentState(): boolean {
        return this.isCollapsedSubject.value;
    }

    isStateReady(): boolean {
        return this.isReadySubject.value;
    }
}

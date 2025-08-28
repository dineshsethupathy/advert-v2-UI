import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    user: UserInfo;
    tenant: TenantInfo;
    permissions: string[];
}

export interface UserInfo {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    tenantId: number;
    roleName: string;
    roleId: number;
}

export interface TenantInfo {
    id: number;
    name: string;
    subdomain: string;
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
}

export interface CurrentUser {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    tenantId: number;
    tenantName: string;
    roleName: string;
    roleId: number;
    permissions: string[];
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = environment.apiUrl;
    private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadCurrentUser();
    }

    login(request: LoginRequest, tenantId?: number): Observable<LoginResponse> {
        const url = tenantId
            ? `${this.API_URL}/auth/login?tenantId=${tenantId}`
            : `${this.API_URL}/auth/login`;

        return this.http.post<LoginResponse>(url, request)
            .pipe(
                map(response => {
                    // Store tokens
                    localStorage.setItem('access_token', response.token);
                    localStorage.setItem('refresh_token', response.refreshToken);

                    // Store user info
                    const currentUser: CurrentUser = {
                        userId: response.user.id,
                        email: response.user.email,
                        firstName: response.user.firstName,
                        lastName: response.user.lastName,
                        userType: response.user.userType,
                        tenantId: response.user.tenantId,
                        tenantName: response.tenant.name,
                        roleName: response.user.roleName,
                        roleId: response.user.roleId,
                        permissions: response.permissions
                    };
                    console.log('currentUser..', currentUser);

                    this.currentUserSubject.next(currentUser);
                    localStorage.setItem('current_user', JSON.stringify(currentUser));

                    return response;
                }),
                catchError(error => {
                    console.error('Login error:', error);
                    return throwError(() => error);
                })
            );
    }

    logout(): Observable<any> {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            return this.http.post(`${this.API_URL}/auth/logout`, { RefreshToken: refreshToken })
                .pipe(
                    map(() => {
                        this.clearAuthData();
                        return { success: true };
                    }),
                    catchError(error => {
                        console.error('Logout error:', error);
                        this.clearAuthData();
                        return throwError(() => error);
                    })
                );
        } else {
            this.clearAuthData();
            return new Observable(observer => {
                observer.next({ success: true });
                observer.complete();
            });
        }
    }

    validateToken(): Observable<any> {
        const token = this.getToken();
        if (!token) {
            return throwError(() => new Error('No token available'));
        }

        return this.http.get(`${this.API_URL}/auth/validate`)
            .pipe(
                catchError(error => {
                    console.error('Token validation error:', error);
                    this.clearAuthData();
                    return throwError(() => error);
                })
            );
    }

    getCurrentUser(): Observable<any> {
        return this.http.get(`${this.API_URL}/auth/me`)
            .pipe(
                map(response => {
                    const currentUser: CurrentUser = {
                        userId: (response as any).userId,
                        email: (response as any).email,
                        firstName: (response as any).firstName,
                        lastName: (response as any).lastName,
                        userType: (response as any).userType,
                        tenantId: (response as any).tenantId,
                        tenantName: (response as any).tenantName,
                        roleName: (response as any).roleName,
                        roleId: (response as any).roleId,
                        permissions: (response as any).permissions || []
                    };

                    this.currentUserSubject.next(currentUser);
                    localStorage.setItem('current_user', JSON.stringify(currentUser));

                    return response;
                }),
                catchError(error => {
                    console.error('Get current user error:', error);
                    this.clearAuthData();
                    return throwError(() => error);
                })
            );
    }

    isAuthenticated(): boolean {
        const token = this.getToken();
        return !!token;
    }

    getToken(): string | null {
        return localStorage.getItem('access_token');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refresh_token');
    }

    getCurrentUserValue(): CurrentUser | null {
        return this.currentUserSubject.value;
    }

    hasPermission(permission: string): boolean {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.permissions.includes(permission) || false;
    }

    hasAnyPermission(permissions: string[]): boolean {
        const currentUser = this.getCurrentUserValue();
        return permissions.some(permission => currentUser?.permissions.includes(permission)) || false;
    }

    isBrandUser(): boolean {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.userType === 'brand';
    }

    isVendor(): boolean {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.userType === 'vendor';
    }

    isDistributor(): boolean {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.userType === 'distributor';
    }

    getTenantId(): number | null {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.tenantId || null;
    }

    getTenantName(): string | null {
        const currentUser = this.getCurrentUserValue();
        return currentUser?.tenantName || null;
    }

    // Methods for vendor components
    getUser(): any {
        const currentUser = this.getCurrentUserValue();
        if (currentUser) {
            return {
                id: currentUser.userId,
                email: currentUser.email,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                userType: currentUser.userType,
                tenantId: currentUser.tenantId,
                roleName: currentUser.roleName,
                roleId: currentUser.roleId
            };
        }
        return null;
    }

    getTenant(): any {
        const currentUser = this.getCurrentUserValue();
        if (currentUser) {
            return {
                id: currentUser.tenantId,
                name: currentUser.tenantName,
                subdomain: '',
                brandName: currentUser.tenantName,
                primaryColor: '#3085d6',
                secondaryColor: '#6c757d'
            };
        }
        return null;
    }

    setToken(token: string): void {
        localStorage.setItem('access_token', token);
    }

    setRefreshToken(refreshToken: string): void {
        localStorage.setItem('refresh_token', refreshToken);
    }

    setUser(user: any): void {
        const currentUser: CurrentUser = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            tenantId: user.tenantId,
            tenantName: user.tenantName || '',
            roleName: user.roleName,
            roleId: user.roleId,
            permissions: []
        };
        this.currentUserSubject.next(currentUser);
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    }

    setTenant(tenant: any): void {
        const currentUser = this.getCurrentUserValue();
        if (currentUser) {
            currentUser.tenantName = tenant.name;
            this.currentUserSubject.next(currentUser);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
    }

    setPermissions(permissions: string[]): void {
        const currentUser = this.getCurrentUserValue();
        if (currentUser) {
            currentUser.permissions = permissions;
            this.currentUserSubject.next(currentUser);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
    }

    updateCurrentUser(updatedUser: CurrentUser): void {
        this.currentUserSubject.next(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
    }

    getAuthHeaders(): HttpHeaders {
        const token = this.getToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

    private loadCurrentUser(): void {
        const userStr = localStorage.getItem('current_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                this.currentUserSubject.next(user);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                this.clearAuthData();
            }
        }
    }

    private clearAuthData(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('current_user');
        this.currentUserSubject.next(null);
    }
} 
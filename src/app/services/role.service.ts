import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Role {
    id: number;
    name: string;
    description: string;
    userCount: number;
    permissions: Permission[];
}

export interface Permission {
    id: number;
    name: string;
    description: string;
    module: string;
    action: string;
}

export interface CreateRoleRequest {
    name: string;
    description: string;
    permissionIds: number[];
}

export interface UpdateRoleRequest {
    id: number;
    name: string;
    description: string;
}

export interface UpdateRolePermissionsRequest {
    permissionIds: number[];
}

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getRoles(): Observable<Role[]> {
        return this.http.get<Role[]>(`${this.API_URL}/role`);
    }

    getRoleById(id: number): Observable<Role> {
        return this.http.get<Role>(`${this.API_URL}/role/${id}`);
    }

    createRole(role: CreateRoleRequest): Observable<Role> {
        return this.http.post<Role>(`${this.API_URL}/role`, role);
    }

    updateRole(role: UpdateRoleRequest): Observable<Role> {
        return this.http.put<Role>(`${this.API_URL}/role/${role.id}`, role);
    }

    deleteRole(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/role/${id}`);
    }

    getRolePermissions(roleId: number): Observable<Permission[]> {
        return this.http.get<Permission[]>(`${this.API_URL}/role/${roleId}/permissions`);
    }

    updateRolePermissions(roleId: number, request: UpdateRolePermissionsRequest): Observable<void> {
        return this.http.put<void>(`${this.API_URL}/role/${roleId}/permissions`, request);
    }

    getAllPermissions(): Observable<Permission[]> {
        return this.http.get<Permission[]>(`${this.API_URL}/role/permissions`);
    }
} 
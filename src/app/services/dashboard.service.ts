import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
    totalUsers: number;
    totalStores: number;
    totalAssignments: number;
    totalVendors: number;
    totalDistributors: number;
}

export interface RecentActivity {
    activityType: string;
    userName: string;
    activity: string;
    activityDate: string;
}

export interface Assignment {
    id: number;
    storeId: number;
    storeName: string;
    vendorId: number;
    vendorName: string;
    assignedDate: string;
    workflowDefinitionId: number;
    workflowName: string;
}

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    lastLoginAt?: string;
    roleName: string;
    roleId: number;
}

export interface Store {
    id: number;
    name: string;
    phoneNumber?: string;
    address?: string;
    regionId: number;
    regionName: string;
    createdBy: string;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getStats(): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.API_URL}/dashboard/stats`);
    }

    getRecentActivity(limit: number = 10): Observable<RecentActivity[]> {
        return this.http.get<RecentActivity[]>(`${this.API_URL}/dashboard/recent-activity?limit=${limit}`);
    }

    getAssignments(): Observable<Assignment[]> {
        return this.http.get<Assignment[]>(`${this.API_URL}/dashboard/assignments`);
    }

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.API_URL}/dashboard/users`);
    }

    getStores(): Observable<Store[]> {
        return this.http.get<Store[]>(`${this.API_URL}/stores`);
    }

    getStoreView(storeAssignmentId: number): Observable<any> {
        return this.http.get<any>(`${this.API_URL}/dashboard/store-view/${storeAssignmentId}`);
    }
} 
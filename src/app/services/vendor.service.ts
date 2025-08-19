import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Vendor {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdDate: Date;
    tenantId: number;
    tenantName: string;
}

export interface CreateVendorRequest {
    email: string;
}

export interface UpdateVendorRequest {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class VendorService {
    private apiUrl = `${environment.apiUrl}/vendor`;

    constructor(private http: HttpClient) { }

    getVendors(): Observable<Vendor[]> {
        return this.http.get<Vendor[]>(this.apiUrl);
    }

    createVendor(request: CreateVendorRequest): Observable<Vendor> {
        return this.http.post<Vendor>(this.apiUrl, request);
    }

    updateVendor(request: UpdateVendorRequest): Observable<Vendor> {
        return this.http.put<Vendor>(`${this.apiUrl}/${request.id}`, request);
    }

    deleteVendor(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
} 
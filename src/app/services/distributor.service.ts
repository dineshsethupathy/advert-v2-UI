import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Distributor {
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

export interface CreateDistributorRequest {
    email: string;
}

export interface UpdateDistributorRequest {
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
export class DistributorService {
    private apiUrl = `${environment.apiUrl}/distributor`;

    constructor(private http: HttpClient) { }

    getDistributors(): Observable<Distributor[]> {
        return this.http.get<Distributor[]>(this.apiUrl);
    }

    createDistributor(request: CreateDistributorRequest): Observable<Distributor> {
        return this.http.post<Distributor>(this.apiUrl, request);
    }

    updateDistributor(request: UpdateDistributorRequest): Observable<Distributor> {
        return this.http.put<Distributor>(`${this.apiUrl}/${request.id}`, request);
    }

    deleteDistributor(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
} 
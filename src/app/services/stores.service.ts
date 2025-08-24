import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Store {
    id: number;
    name: string;
    sapId: string;
    phoneNumber?: string;
    address?: string;
    regionId: number;
    regionName: string;
    createdBy: string;
}

export interface StoreWithAssignmentHistory extends Store {
    lastAssignmentDate?: string;
    lastAssignedBoardName?: string;
    lastAssignedBoardType?: string;
    lastAssignedBoardCost?: number;
}

export interface CreateStoreRequest {
    name: string;
    sapId: string;
    phoneNumber?: string;
    address?: string;
    regionId: number;
}

export interface UpdateStoreRequest {
    name: string;
    sapId: string;
    phoneNumber?: string;
    address?: string;
    regionId: number;
}

export interface ImportResponse {
    importedCount: number;
    errors: string[];
    storesWithMissingRegions?: string[];
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class StoresService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getStores(): Observable<Store[]> {
        return this.http.get<Store[]>(`${this.API_URL}/stores`);
    }

    getStoresForAssignmentCreation(): Observable<StoreWithAssignmentHistory[]> {
        return this.http.get<StoreWithAssignmentHistory[]>(`${this.API_URL}/stores/for-assignment`);
    }

    getStoreById(id: number): Observable<Store> {
        return this.http.get<Store>(`${this.API_URL}/stores/${id}`);
    }

    createStore(store: CreateStoreRequest): Observable<Store> {
        return this.http.post<Store>(`${this.API_URL}/stores`, store);
    }

    updateStore(id: number, store: UpdateStoreRequest): Observable<Store> {
        return this.http.put<Store>(`${this.API_URL}/stores/${id}`, store);
    }

    deleteStore(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/stores/${id}`);
    }

    importStores(file: File): Observable<ImportResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ImportResponse>(`${this.API_URL}/stores/import`, formData);
    }
} 
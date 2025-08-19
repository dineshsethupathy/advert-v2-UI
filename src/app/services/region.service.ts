import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Region {
    id: number;
    name: string;
    description: string;
    createdDate: string;
    createdBy: number;
    isDeleted: boolean;
}

export interface CreateRegionRequest {
    name: string;
    description: string;
}

export interface UpdateRegionRequest {
    id: number;
    name: string;
    description: string;
}

@Injectable({
    providedIn: 'root'
})
export class RegionService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getRegions(): Observable<Region[]> {
        return this.http.get<Region[]>(`${this.API_URL}/region`);
    }

    getRegionById(id: number): Observable<Region> {
        return this.http.get<Region>(`${this.API_URL}/region/${id}`);
    }

    createRegion(region: CreateRegionRequest): Observable<Region> {
        return this.http.post<Region>(`${this.API_URL}/region`, region);
    }

    updateRegion(region: UpdateRegionRequest): Observable<Region> {
        return this.http.put<Region>(`${this.API_URL}/region/${region.id}`, region);
    }

    deleteRegion(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/region/${id}`);
    }
} 
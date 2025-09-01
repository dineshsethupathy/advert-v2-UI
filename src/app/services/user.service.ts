import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Region } from './region.service';

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    lastLoginAt?: string;
    signature?: string;
    roleName: string;
    roleId: number;
    regions?: string; // Comma-separated region IDs
    regionList?: Region[]; // Parsed region objects for display
}

export interface CreateUserRequest {
    email: string;
    password: string | null;
    firstName: string;
    lastName: string;
    roleId: number;
    regionIds?: number[]; // List of region IDs to assign
}

export interface UpdateUserRequest {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
    regionIds?: number[]; // List of region IDs to assign
}

export interface UpdateSignatureRequest {
    id: number;
    signature?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.API_URL}/user`);
    }

    getUserById(id: number): Observable<User> {
        return this.http.get<User>(`${this.API_URL}/user/${id}`);
    }

    createUser(user: CreateUserRequest): Observable<User> {
        return this.http.post<User>(`${this.API_URL}/user`, user);
    }

    updateUser(user: UpdateUserRequest): Observable<User> {
        return this.http.put<User>(`${this.API_URL}/user/${user.id}`, user);
    }

    updateSignature(user: UpdateSignatureRequest): Observable<User> {
        return this.http.put<User>(`${this.API_URL}/user/${user.id}/signature`, user);
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/user/${id}`);
    }
} 
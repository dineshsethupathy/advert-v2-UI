import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    lastLoginAt?: string;
    roleName: string;
    roleId: number;
}

export interface CreateUserRequest {
    email: string;
    password: string | null;
    firstName: string;
    lastName: string;
    roleId: number;
}

export interface UpdateUserRequest {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
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

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/user/${id}`);
    }
} 
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

export interface VendorSignupRequest {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    user: any;
    tenant: any;
    permissions: string[];
}

@Injectable({
    providedIn: 'root'
})
export class VendorAuthService {
    private apiUrl = `${environment.apiUrl}/vendorAuth`;

    constructor(private http: HttpClient) { }

    signup(request: VendorSignupRequest): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/signup`, request);
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request);
    }

    validateSignup(email: string): Observable<boolean> {
        return this.http.get<{ isValid: boolean }>(`${this.apiUrl}/validate-signup?email=${encodeURIComponent(email)}`)
            .pipe(
                map(response => response.isValid)
            );
    }
} 
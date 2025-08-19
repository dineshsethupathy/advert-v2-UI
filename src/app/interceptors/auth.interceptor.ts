import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const AuthInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<any> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = authService.getToken();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Check if this is a login endpoint - don't redirect for login failures
                const isLoginEndpoint = req.url.includes('/auth/login') || req.url.includes('/vendorAuth/login');

                if (!isLoginEndpoint) {
                    // Unauthorized - redirect to login only for non-login endpoints
                    authService.logout().subscribe(() => {
                        router.navigate(['/login']);
                    });
                }
            }
            return throwError(() => error);
        })
    );
}; 
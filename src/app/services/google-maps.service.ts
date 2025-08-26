import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GoogleMapsService {
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    loadGoogleMapsAPI(): Promise<void> {
        if (this.isLoaded) {
            return Promise.resolve();
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = new Promise<void>((resolve, reject) => {
            // Check if already loaded
            if ((window as any).google && (window as any).google.maps) {
                this.isLoaded = true;
                resolve();
                return;
            }

            // Create script element with proper async loading
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.defer = true;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&loading=async`;

            script.onload = () => {
                this.isLoaded = true;
                resolve();
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google Maps API'));
            };

            // Add script to head
            document.head.appendChild(script);
        });

        return this.loadPromise;
    }

    isGoogleMapsLoaded(): boolean {
        return this.isLoaded && !!(window as any).google && !!(window as any).google.maps;
    }
}

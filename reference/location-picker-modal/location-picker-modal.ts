import { Component, ElementRef, ViewChild, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

// Remove any remaining references to the google namespace in type annotations or comments

@Component({
  selector: 'app-location-picker-modal',
  standalone: true,
  templateUrl: './location-picker-modal.html',
  styleUrl: './location-picker-modal.css',
  imports: [CommonModule]
})
export class LocationPickerModal {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  map: any = null;
  marker: any = null;
  address: string = '';
  coords: { lat: number, lng: number } | null = null;
  loading = true;
  error: string = '';
  blueDotMarker: any = null;

  constructor(
    private dialogRef: MatDialogRef<LocationPickerModal>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngAfterViewInit() {
    this.waitForMapContainer();
  }

  waitForMapContainer(retries = 10) {
    if (this.mapContainer && this.mapContainer.nativeElement) {
      this.initMap();
    } else if (retries > 0) {
      setTimeout(() => this.waitForMapContainer(retries - 1), 50);
    } else {
      this.error = 'Failed to load map container.';
      this.loading = false;
    }
  }

  initMap() {
    if (!(window as any).google || !(window as any).google.maps) {
      this.error = 'Google Maps failed to load.';
      this.loading = false;
      return;
    }
    // Use passed-in coords if available
    const initialCoords = this.data?.coords;
    if (initialCoords && typeof initialCoords.lat === 'number' && typeof initialCoords.lng === 'number') {
      this.createMap(initialCoords.lat, initialCoords.lng);
      return;
    }
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.createMap(lat, lng);
        },
        () => {
          // Fallback to a default location (e.g., Lagos)
          this.createMap(9.926110, 78.125368);
        }
      );
    } else {
      this.createMap(9.926110, 78.125368);
    }
  }

  createMap(lat: number, lng: number) {
    this.coords = { lat, lng };
    const gmaps: any = (window as any).google.maps;
    this.map = new gmaps.Map(this.mapContainer.nativeElement, {
      center: { lat, lng },
      zoom: 16,
      disableDefaultUI: false,
      streetViewControl: false,
      mapId: 'ea95ec29e92cb56dbd54e384', // <-- Replace with your actual Map ID
      gestureHandling: 'greedy',
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      fullscreenControl: false
    });
    const AdvancedMarkerElement = gmaps.marker.AdvancedMarkerElement;
    this.marker = new AdvancedMarkerElement({
      map: this.map,
      position: { lat, lng },
      title: 'Pin your location',
      draggable: true
    });
    this.loading = false;
    this.reverseGeocode(lat, lng);
    // Listen for marker drag end
    this.marker.addListener('dragend', (event: any) => {
      const pos = this.marker.position;
      if (pos) {
        this.coords = { lat: pos.lat, lng: pos.lng };
        this.reverseGeocode(pos.lat, pos.lng);
      }
    });
    // Listen for map click to drop/move marker
    this.map.addListener('click', (event: any) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat && lng) {
        this.marker.position = { lat, lng };
        this.marker.map = this.map; // Ensure marker is visible if it was removed
        this.coords = { lat, lng };
        this.reverseGeocode(lat, lng);
      }
    });
    // Add custom My Location button
    this.addMyLocationButton(gmaps, AdvancedMarkerElement);
  }

  addMyLocationButton(gmaps: any, AdvancedMarkerElement: any) {
    const controlDiv = document.createElement('div');
    controlDiv.style.margin = '10px';
    controlDiv.style.background = '#fff';
    controlDiv.style.borderRadius = '50%';
    controlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    controlDiv.style.width = '44px';
    controlDiv.style.height = '44px';
    controlDiv.style.display = 'flex';
    controlDiv.style.alignItems = 'center';
    controlDiv.style.justifyContent = 'center';
    controlDiv.style.cursor = 'pointer';
    controlDiv.title = 'My Location';
    controlDiv.innerHTML = `<span style="font-size: 28px; color: #2563eb;">📍</span>`;
    this.map.controls[gmaps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
    controlDiv.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            this.map.setCenter({ lat: userLat, lng: userLng });
            // Remove previous blue dot if exists
            if (this.blueDotMarker) {
              this.blueDotMarker.map = null;
              this.blueDotMarker = null;
            }
            // Create a blue dot marker
            const blueDot = document.createElement('div');
            blueDot.style.width = '18px';
            blueDot.style.height = '18px';
            blueDot.style.background = '#2563eb';
            blueDot.style.border = '3px solid #fff';
            blueDot.style.borderRadius = '50%';
            blueDot.style.boxShadow = '0 0 8px #2563eb88';
            blueDot.style.margin = '0 auto';
            this.blueDotMarker = new AdvancedMarkerElement({
              map: this.map,
              position: { lat: userLat, lng: userLng },
              content: blueDot,
              title: 'Your Location'
            });
          },
          (error: any) => {
            // alert('Unable to access your location.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    });
  }

  reverseGeocode(lat: number, lng: number) {
    const gmaps: any = (window as any).google.maps;
    const geocoder = new gmaps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]) {
        this.address = results[0].formatted_address;
      } else {
        this.address = 'Address not found';
      }
    });
  }

  confirm() {
    if (this.address && this.coords) {
      this.dialogRef.close({ address: this.address, coords: `${this.coords.lat}, ${this.coords.lng}` });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}

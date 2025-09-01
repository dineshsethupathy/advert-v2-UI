import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface State {
    id: number;
    name: string;
    isDeleted: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class StatesService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getStates(): Observable<State[]> {
        return this.http.get<State[]>(`${this.API_URL}/region/states`);
    }

    getStateById(id: number): Observable<State> {
        return this.http.get<State>(`${this.API_URL}/states/${id}`);
    }
}

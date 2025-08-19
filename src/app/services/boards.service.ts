import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Board {
    id: number;
    name: string;
    brandName: string;
    width: number;
    height: number;
    imageUrl?: string;
    createdAt: string;
    createdBy: string;
}

export interface CreateBoardRequest {
    name: string;
    brandName: string;
    width: number;
    height: number;
    imageUrl?: string;
}

export interface UpdateBoardRequest {
    id: number;
    name: string;
    brandName: string;
    width: number;
    height: number;
    imageUrl?: string;
}

export interface UploadImageResponse {
    imageUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class BoardsService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getBoards(): Observable<Board[]> {
        return this.http.get<Board[]>(`${this.API_URL}/boards`);
    }

    getBoard(id: number): Observable<Board> {
        return this.http.get<Board>(`${this.API_URL}/boards/${id}`);
    }

    createBoard(request: CreateBoardRequest, imageFile?: File): Observable<Board> {
        const formData = new FormData();
        formData.append('name', request.name);
        formData.append('brandName', request.brandName);
        formData.append('width', request.width.toString());
        formData.append('height', request.height.toString());

        if (imageFile) {
            formData.append('imageFile', imageFile);
        }

        return this.http.post<Board>(`${this.API_URL}/boards`, formData);
    }

    updateBoard(id: number, request: UpdateBoardRequest, imageFile?: File): Observable<Board> {
        const formData = new FormData();
        formData.append('id', request.id.toString());
        formData.append('name', request.name);
        formData.append('brandName', request.brandName);
        formData.append('width', request.width.toString());
        formData.append('height', request.height.toString());

        // Always include imageUrl (can be empty string if no image)
        formData.append('imageUrl', request.imageUrl || '');

        if (imageFile) {
            formData.append('imageFile', imageFile);
        }

        return this.http.put<Board>(`${this.API_URL}/boards/${id}`, formData);
    }

    deleteBoard(id: number): Observable<any> {
        return this.http.delete(`${this.API_URL}/boards/${id}`);
    }
} 
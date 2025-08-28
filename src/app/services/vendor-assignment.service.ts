import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VendorAssignment {
    id: number;
    name: string;
    description?: string;
    status: string;
    totalStores: number;
    completedStores: number;
    createdDt: string;
    workflowName: string;
    vendorId: number;
    vendorName?: string;
    assignedBy: number;
    assignedByName?: string;
    assignedDate?: string;
    workflowDefinitionId: number;
    updatedAt?: string;
    // Add pole fields for consistency
    poleQuantity?: number;
    poleWidth?: number;
    poleHeight?: number;
}

export interface VendorAssignmentDetail extends VendorAssignment {
    workflowDescription?: string;
    startedStores: number;
    pendingStores: number;
}

export interface StoreAssignment {
    id: number;
    assignmentId: number;
    storeId: number;
    storeName: string;
    sapId?: string;
    storePhoneNumber?: string;
    storeAddress: string;
    regionName?: string;
    vendorWorkStatus: string;
    approvalStatus: string;
    startedDate?: string;
    beforeExecutionDate?: string;
    afterExecutionDate?: string;
    completedDate?: string;
    vendorNotes?: string;
    createdAt: string;
    updatedAt?: string;
    workflowProgress?: WorkflowProgress[];
    // New fields for store form
    boardId?: number;
    boardName?: string;
    bannerImageUrl?: string;
    beforeExecutionImageUrl?: string;
    afterExecutionImageUrl?: string;
    boardWidth?: number;
    boardHeight?: number;
    boardCost?: number;
    gpsLocation?: string;  // address|lat|lng format
    poleQuantity?: number;
    poleWidth?: number;
    poleHeight?: number;
    poleCost?: number;
}

export interface UpdateStoreStatusRequest {
    status: string; // 'Pending', 'Started', 'Before Execution', 'After Execution', 'Completed'
    notes?: string;
}

export interface UpdateStoreFormRequest {
    bannerImageUrl?: string;
    beforeExecutionImageUrl?: string;
    afterExecutionImageUrl?: string;
    boardId?: number;
    boardWidth?: number;
    boardHeight?: number;
    boardCost?: number;
    notes?: string;
    gpsLocation?: string;  // address|lat|lng format
    poleQuantity?: number;
    poleWidth?: number;
    poleHeight?: number;
    poleCost?: number;
}

export interface Board {
    id: number;
    name: string;
    brandName: string;
    width: number;
    height: number;
    cost?: number;
}

export interface StoreFormResponse {
    storeForm: StoreAssignment;
    availableBoards: Board[];
}

export interface VendorStats {
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalStores: number;
    completedStores: number;
    startedStores: number;
    pendingStores: number;
}

export interface WorkflowProgress {
    stepId: number;
    stepName: string;
    stepDescription?: string;
    stepOrder: number;
    isRequired: boolean;
    totalStores: number;
    completedStores: number;
    completionPercentage: number;
}

@Injectable({
    providedIn: 'root'
})
export class VendorAssignmentService {
    private apiUrl = `${environment.apiUrl}/vendor-app`;
    private storeApiUrl = `${environment.apiUrl}/vendor-store`;

    constructor(private http: HttpClient) { }

    getAssignments(): Observable<VendorAssignment[]> {
        return this.http.get<VendorAssignment[]>(`${this.apiUrl}/assignments`);
    }

    getAssignment(id: number): Observable<VendorAssignmentDetail> {
        return this.http.get<VendorAssignmentDetail>(`${this.apiUrl}/assignments/${id}`);
    }

    getStoreAssignments(assignmentId: number): Observable<StoreAssignment[]> {
        return this.http.get<StoreAssignment[]>(`${this.apiUrl}/assignments/${assignmentId}/stores`);
    }

    updateStoreStatus(storeAssignmentId: number, request: UpdateStoreStatusRequest): Observable<StoreAssignment> {
        return this.http.put<StoreAssignment>(`${this.apiUrl}/stores/${storeAssignmentId}/status`, request);
    }

    getWorkflowProgress(assignmentId: number): Observable<WorkflowProgress[]> {
        return this.http.get<WorkflowProgress[]>(`${this.apiUrl}/assignments/${assignmentId}/progress`);
    }

    getStoreWorkflowProgress(storeAssignmentId: number): Observable<WorkflowProgress[]> {
        return this.http.get<WorkflowProgress[]>(`${this.apiUrl}/stores/${storeAssignmentId}/progress`);
    }

    getVendorStats(): Observable<VendorStats> {
        return this.http.get<VendorStats>(`${this.apiUrl}/stats`);
    }

    // New methods for store form operations
    getStoreForm(storeAssignmentId: number): Observable<StoreFormResponse> {
        return this.http.get<StoreFormResponse>(`${this.storeApiUrl}/stores/${storeAssignmentId}/form`);
    }

    updateStoreForm(storeAssignmentId: number, formData: FormData): Observable<StoreAssignment> {
        return this.http.put<StoreAssignment>(`${this.storeApiUrl}/stores/${storeAssignmentId}/form`, formData);
    }

    markStoreAsComplete(storeAssignmentId: number): Observable<StoreAssignment> {
        return this.http.put<StoreAssignment>(`${this.storeApiUrl}/stores/${storeAssignmentId}/complete`, {});
    }
}
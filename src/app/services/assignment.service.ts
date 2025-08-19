import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssignmentCreateRequest {
    name: string;
    description?: string;
    vendorId: number;
    workflowDefinitionId: number;
    storeIds: number[];
}

export interface AssignmentUpdateRequest {
    name?: string;
    description?: string;
    vendorId?: number;
    workflowDefinitionId?: number;
}

export interface AssignmentResponse {
    id: number;
    name: string;
    description?: string;
    vendorId: number;
    vendorName: string;
    workflowDefinitionId: number;
    workflowName: string;
    assignedBy: number;
    assignedByName: string;
    status: string;
    totalStores: number;
    completedStores: number;
    createdDt: string;
    updatedDt?: string;
}

export interface StoreAssignmentResponse {
    id: number;
    assignmentId: number;
    storeId: number;
    storeName: string;
    storeAddress: string;
    vendorWorkStatus: string;
    approvalStatus: string;
    startedDate?: string;
    beforeExecutionDate?: string;
    afterExecutionDate?: string;
    completedDate?: string;
    vendorNotes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface StoreStatusUpdateRequest {
    status: string; // Started, Before Execution, After Execution, Completed
}

export interface ApprovalStatusUpdateRequest {
    status: string; // Pending, BDE Approved, BDM Approved, HO Approved, Payment Approved, Archived
}

export interface WorkflowProgressResponse {
    assignmentId: number;
    assignmentName: string;
    stages: WorkflowStageProgress[];
    storeAssignments: StoreAssignmentResponse[];
}

export interface WorkflowStageProgress {
    stageId: number;
    stageName: string;
    stageOrder: number;
    roleName: string;
    isFinalStage: boolean;
    completedStores: number;
    totalStores: number;
    progressPercentage: number;
}

// =============================================
// BRAND USER STORE VIEW INTERFACES
// =============================================

export interface BrandUserStoreViewResponse {
    storeAssignment: StoreAssignmentDetailResponse;
    assignment: AssignmentSummaryResponse;
    vendorWorkflow: VendorWorkflowStageResponse[];
    approvalWorkflow: ApprovalWorkflowStageResponse[];
    workflowStages: WorkflowStageVisualResponse[];
}

export interface StoreAssignmentDetailResponse {
    id: number;
    assignmentId: number;
    storeId: number;
    storeName: string;
    sapId: string;
    storePhoneNumber?: string;
    storeAddress?: string;
    regionName?: string;
    vendorWorkStatus: string;
    approvalStatus: string;
    startedDate?: string;
    beforeExecutionDate?: string;
    afterExecutionDate?: string;
    completedDate?: string;
    vendorNotes?: string;
    bannerImageUrl?: string;
    beforeExecutionImageUrl?: string;
    afterExecutionImageUrl?: string;
    boardWidth?: number;
    boardHeight?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface AssignmentSummaryResponse {
    id: number;
    name: string;
    description?: string;
    vendorId: number;
    vendorName: string;
    assignedBy: number;
    assignedByName: string;
    assignedDate: string;
    workflowDefinitionId: number;
    workflowName: string;
    workflowDescription?: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
}

export interface VendorWorkflowStageResponse {
    id: number;
    storeAssignmentId: number;
    workflowStageId: number;
    stageName: string;
    stageOrder: number;
    isFinalStage: boolean;
    status: string;
    assignedToType: string;
    assignedToId: number;
    action?: string;
    comment?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ApprovalWorkflowStageResponse {
    id: number;
    storeAssignmentId: number;
    workflowStageId: number;
    stageName: string;
    stageOrder: number;
    isFinalStage: boolean;
    status: string;
    assignedToType: string;
    assignedToId: number;
    roleName: string;
    action?: string;
    comment?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt?: string;
    assignedToUserName?: string;
}

export interface WorkflowStageVisualResponse {
    id: number;
    stageName: string;
    stageOrder: number;
    isFinalStage: boolean;
    roleName: string;
    roleId: number;
    workflowName: string;
}

@Injectable({
    providedIn: 'root'
})
export class AssignmentService {
    private apiUrl = `${environment.apiUrl}/assignment`;

    constructor(private http: HttpClient) { }

    // =============================================
    // ASSIGNMENT OPERATIONS
    // =============================================

    createAssignment(request: AssignmentCreateRequest): Observable<AssignmentResponse> {
        return this.http.post<AssignmentResponse>(this.apiUrl, request);
    }

    getAssignments(): Observable<AssignmentResponse[]> {
        return this.http.get<AssignmentResponse[]>(this.apiUrl);
    }

    getAssignment(id: number): Observable<AssignmentResponse> {
        return this.http.get<AssignmentResponse>(`${this.apiUrl}/${id}`);
    }

    updateAssignment(id: number, request: AssignmentUpdateRequest): Observable<AssignmentResponse> {
        return this.http.put<AssignmentResponse>(`${this.apiUrl}/${id}`, request);
    }

    deleteAssignment(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    // =============================================
    // STORE ASSIGNMENT OPERATIONS
    // =============================================

    getStoreAssignments(assignmentId: number): Observable<StoreAssignmentResponse[]> {
        return this.http.get<StoreAssignmentResponse[]>(`${this.apiUrl}/${assignmentId}/stores`);
    }

    updateStoreStatus(storeAssignmentId: number, request: StoreStatusUpdateRequest): Observable<StoreAssignmentResponse> {
        return this.http.put<StoreAssignmentResponse>(`${this.apiUrl}/stores/${storeAssignmentId}/status`, request);
    }

    updateApprovalStatus(storeAssignmentId: number, request: ApprovalStatusUpdateRequest): Observable<StoreAssignmentResponse> {
        return this.http.put<StoreAssignmentResponse>(`${this.apiUrl}/stores/${storeAssignmentId}/approval`, request);
    }

    // =============================================
    // WORKFLOW PROGRESS OPERATIONS
    // =============================================

    getWorkflowProgress(assignmentId: number): Observable<WorkflowProgressResponse> {
        return this.http.get<WorkflowProgressResponse>(`${this.apiUrl}/${assignmentId}/progress`);
    }

    // =============================================
    // BRAND USER STORE VIEW OPERATIONS
    // =============================================

    getBrandUserStoreView(storeAssignmentId: number): Observable<BrandUserStoreViewResponse> {
        return this.http.get<BrandUserStoreViewResponse>(`${environment.apiUrl}/dashboard/store-view/${storeAssignmentId}`);
    }
} 
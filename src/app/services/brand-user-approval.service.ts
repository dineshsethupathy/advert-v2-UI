import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApprovalRequest {
    comment?: string;
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
    assignedToRoleName?: string;  // Changed from assignedToUserName to assignedToRoleName
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
export class BrandUserApprovalService {
    private apiUrl = `${environment.apiUrl}/brand-user-approval`;

    constructor(private http: HttpClient) { }

    // =============================================
    // BRAND USER APPROVAL OPERATIONS
    // =============================================

    approveStage(storeAssignmentId: number, workflowStageId: number, comment?: string): Observable<ApprovalWorkflowStageResponse> {
        const request: ApprovalRequest = { comment };
        return this.http.put<ApprovalWorkflowStageResponse>(
            `${this.apiUrl}/stores/${storeAssignmentId}/stages/${workflowStageId}/approve`,
            request
        );
    }

    rejectStage(storeAssignmentId: number, workflowStageId: number, comment?: string): Observable<ApprovalWorkflowStageResponse> {
        const request: ApprovalRequest = { comment };
        return this.http.put<ApprovalWorkflowStageResponse>(
            `${this.apiUrl}/stores/${storeAssignmentId}/stages/${workflowStageId}/reject`,
            request
        );
    }

    getApprovalWorkflowProgress(storeAssignmentId: number): Observable<ApprovalWorkflowStageResponse[]> {
        return this.http.get<ApprovalWorkflowStageResponse[]>(
            `${this.apiUrl}/stores/${storeAssignmentId}/progress`
        );
    }

    getApprovalWorkflowStages(): Observable<WorkflowStageVisualResponse[]> {
        return this.http.get<WorkflowStageVisualResponse[]>(`${this.apiUrl}/stages`);
    }
}

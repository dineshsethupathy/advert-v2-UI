import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApprovalRequest {
    Comment?: string;
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
    assignedToRoleName?: string;
    actionedBy?: number | null;
    actionedByName?: string | null;
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
    private apiUrl = `${environment.apiUrl}/branduserapproval`;

    constructor(private http: HttpClient) { }

    // =============================================
    // BRAND USER APPROVAL OPERATIONS
    // =============================================

    approveStage(storeAssignmentId: number, workflowStageId: number, comment?: string): Observable<ApprovalWorkflowStageResponse> {
        // Convert undefined to empty string for proper serialization
        const commentValue = comment || '';
        const request: ApprovalRequest = { Comment: commentValue };

        return this.http.put<ApprovalWorkflowStageResponse>(
            `${this.apiUrl}/stores/${storeAssignmentId}/stages/${workflowStageId}/approve`,
            request
        );
    }

    rejectStage(storeAssignmentId: number, workflowStageId: number, comment?: string): Observable<ApprovalWorkflowStageResponse> {
        // Convert undefined to empty string for proper serialization
        const commentValue = comment || '';
        const request: ApprovalRequest = { Comment: commentValue };

        console.log('=== REJECT STAGE REQUEST DEBUG ===');
        console.log('URL:', `${this.apiUrl}/stores/${storeAssignmentId}/stages/${workflowStageId}/reject`);
        console.log('Comment:', comment);
        console.log('Comment Value:', commentValue);
        console.log('Request Body:', request);
        console.log('====================================');

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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WorkflowCreateRequest {
    name: string;
    description?: string;
    stages: WorkflowStageRequest[];
}

export interface WorkflowUpdateRequest {
    name?: string;
    description?: string;
}

export interface WorkflowResponse {
    id: number;
    name: string;
    description?: string;
    createdBy: number;
    createdByName: string;
    createdDt: string;
    updatedDt?: string;
    stageCount: number;
    assignmentCount: number;
}

export interface WorkflowStageRequest {
    stageName: string;
    stageOrder: number;
    roleRequired: number;
    isFinalStage: boolean;
}

export interface WorkflowStageResponse {
    id: number;
    workflowDefinitionId: number;
    stageName: string;
    stageOrder: number;
    roleRequired: number;
    roleName: string;
    isFinalStage: boolean;
    createdAt: string;
}

export interface WorkflowStageOrderUpdateRequest {
    stages: StageOrderItem[];
}

export interface StageOrderItem {
    stageId: number;
    newOrder: number;
}

export interface WorkflowStatisticsResponse {
    totalWorkflows: number;
    activeWorkflows: number;
    avgStagesPerWorkflow: number;
}

@Injectable({
    providedIn: 'root'
})
export class WorkflowService {
    private apiUrl = `${environment.apiUrl}/workflow`;

    constructor(private http: HttpClient) { }

    // =============================================
    // WORKFLOW DEFINITION OPERATIONS
    // =============================================

    createWorkflow(request: WorkflowCreateRequest): Observable<WorkflowResponse> {
        return this.http.post<WorkflowResponse>(this.apiUrl, request);
    }

    getWorkflows(): Observable<WorkflowResponse[]> {
        return this.http.get<WorkflowResponse[]>(this.apiUrl);
    }

    getWorkflow(id: number): Observable<WorkflowResponse> {
        return this.http.get<WorkflowResponse>(`${this.apiUrl}/${id}`);
    }

    updateWorkflow(id: number, request: WorkflowUpdateRequest): Observable<WorkflowResponse> {
        return this.http.put<WorkflowResponse>(`${this.apiUrl}/${id}`, request);
    }

    deleteWorkflow(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    // =============================================
    // WORKFLOW STAGE OPERATIONS
    // =============================================

    createStage(workflowId: number, request: WorkflowStageRequest): Observable<WorkflowStageResponse> {
        return this.http.post<WorkflowStageResponse>(`${this.apiUrl}/${workflowId}/stages`, request);
    }

    getStages(workflowId: number): Observable<WorkflowStageResponse[]> {
        return this.http.get<WorkflowStageResponse[]>(`${this.apiUrl}/${workflowId}/stages`);
    }

    updateStage(workflowId: number, stageId: number, request: WorkflowStageRequest): Observable<WorkflowStageResponse> {
        return this.http.put<WorkflowStageResponse>(`${this.apiUrl}/${workflowId}/stages/${stageId}`, request);
    }

    deleteStage(workflowId: number, stageId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${workflowId}/stages/${stageId}`);
    }

    updateStageOrder(workflowId: number, request: WorkflowStageOrderUpdateRequest): Observable<any> {
        return this.http.put(`${this.apiUrl}/${workflowId}/stages/order`, request);
    }

    // =============================================
    // WORKFLOW STATISTICS
    // =============================================

    getStatistics(): Observable<WorkflowStatisticsResponse> {
        return this.http.get<WorkflowStatisticsResponse>(`${this.apiUrl}/statistics`);
    }
} 
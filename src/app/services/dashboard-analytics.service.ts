import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssignmentService, AssignmentResponse } from './assignment.service';

export interface DashboardAnalytics {
    assignmentStats: AssignmentStats;
    workflowStats: WorkflowStats;
    vendorStats: VendorStats;
    recentActivities: DashboardActivity[];
    pendingActions: PendingAction[];
    performanceMetrics: PerformanceMetrics;
}

export interface AssignmentStats {
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    cancelledAssignments: number;
    totalStores: number;
    completedStores: number;
    overallProgress: number;
    averageCompletionTime: number;
}

export interface WorkflowStats {
    totalStages: number;
    storesInProgress: number;
    pendingApprovals: number;
    stageBreakdown: StageBreakdown[];
    bottleneckStages: string[];
}

export interface StageBreakdown {
    stageName: string;
    roleName: string;
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    progressPercentage: number;
}

export interface VendorStats {
    totalVendors: number;
    activeVendors: number;
    topPerformers: TopVendor[];
    averageCompletionRate: number;
}

export interface TopVendor {
    vendorId: number;
    vendorName: string;
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    averageTime: number;
}

export interface DashboardActivity {
    id: number;
    type: 'assignment_created' | 'status_updated' | 'approval_given' | 'store_completed';
    title: string;
    description: string;
    timestamp: string;
    userId: number;
    userName: string;
    assignmentId?: number;
    assignmentName?: string;
    storeId?: number;
    storeName?: string;
}

export interface PendingAction {
    id: number;
    type: 'approval' | 'status_update' | 'assignment_review';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    assignmentId?: number;
    assignmentName?: string;
    storeId?: number;
    storeName?: string;
    vendorId?: number;
    vendorName?: string;
}

export interface PerformanceMetrics {
    averageAssignmentTime: number;
    averageStageTime: number;
    completionRateTrend: number;
    vendorPerformanceTrend: number;
    topPerformingRegions: RegionPerformance[];
}

export interface RegionPerformance {
    regionId: number;
    regionName: string;
    totalStores: number;
    completedStores: number;
    completionRate: number;
    averageTime: number;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardAnalyticsService {
    private readonly API_URL = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private assignmentService: AssignmentService
    ) { }

    getDashboardAnalytics(): Observable<DashboardAnalytics> {
        return forkJoin({
            assignments: this.assignmentService.getAssignments(),
            // Add other API calls as needed
        }).pipe(
            map(data => this.processAnalytics(data))
        );
    }

    private processAnalytics(data: any): DashboardAnalytics {
        const assignments = data.assignments as AssignmentResponse[];

        return {
            assignmentStats: this.calculateAssignmentStats(assignments),
            workflowStats: this.calculateWorkflowStats(assignments),
            vendorStats: this.calculateVendorStats(assignments),
            recentActivities: this.generateRecentActivities(assignments),
            pendingActions: this.generatePendingActions(assignments),
            performanceMetrics: this.calculatePerformanceMetrics(assignments)
        };
    }

    private calculateAssignmentStats(assignments: AssignmentResponse[]): AssignmentStats {
        const totalAssignments = assignments.length;
        const activeAssignments = assignments.filter(a => a.status === 'Active').length;
        const completedAssignments = assignments.filter(a => a.status === 'Completed').length;
        const cancelledAssignments = assignments.filter(a => a.status === 'Cancelled').length;

        const totalStores = assignments.reduce((sum, a) => sum + a.totalStores, 0);
        const completedStores = assignments.reduce((sum, a) => sum + a.completedStores, 0);
        const overallProgress = totalStores > 0 ? (completedStores / totalStores) * 100 : 0;

        return {
            totalAssignments,
            activeAssignments,
            completedAssignments,
            cancelledAssignments,
            totalStores,
            completedStores,
            overallProgress,
            averageCompletionTime: 0 // TODO: Calculate from actual data
        };
    }

    private calculateWorkflowStats(assignments: AssignmentResponse[]): WorkflowStats {
        const storesInProgress = assignments.reduce((sum, a) =>
            sum + (a.totalStores - a.completedStores), 0);

        return {
            totalStages: 0, // TODO: Get from workflow definitions
            storesInProgress,
            pendingApprovals: 0, // TODO: Calculate from approval data
            stageBreakdown: [],
            bottleneckStages: []
        };
    }

    private calculateVendorStats(assignments: AssignmentResponse[]): VendorStats {
        const vendorMap = new Map<number, {
            name: string,
            totalAssignments: number,
            completedAssignments: number,
            totalStores: number,
            completedStores: number,
            assignmentIds: number[]
        }>();

        // Group assignments by vendor
        assignments.forEach(assignment => {
            const existing = vendorMap.get(assignment.vendorId) || {
                name: assignment.vendorName,
                totalAssignments: 0,
                completedAssignments: 0,
                totalStores: 0,
                completedStores: 0,
                assignmentIds: []
            };

            existing.totalAssignments += 1;
            existing.totalStores += assignment.totalStores;
            existing.completedStores += assignment.completedStores;
            existing.assignmentIds.push(assignment.id);

            // Count completed assignments (where all stores are completed)
            if (assignment.totalStores > 0 && assignment.completedStores === assignment.totalStores) {
                existing.completedAssignments += 1;
            }

            vendorMap.set(assignment.vendorId, existing);
        });

        // Calculate performance metrics for each vendor
        const topPerformers: TopVendor[] = Array.from(vendorMap.entries()).map(([id, data]) => {
            // Calculate assignment completion rate
            const assignmentCompletionRate = data.totalAssignments > 0 ?
                (data.completedAssignments / data.totalAssignments) * 100 : 0;

            // Calculate store completion rate
            const storeCompletionRate = data.totalStores > 0 ?
                (data.completedStores / data.totalStores) * 100 : 0;

            // Combined performance score (weighted average)
            const performanceScore = (assignmentCompletionRate * 0.6) + (storeCompletionRate * 0.4);

            return {
                vendorId: id,
                vendorName: data.name,
                totalAssignments: data.totalAssignments,
                completedAssignments: data.completedAssignments,
                completionRate: performanceScore,
                averageTime: 0 // TODO: Calculate from actual completion dates
            };
        }).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);

        return {
            totalVendors: vendorMap.size,
            activeVendors: assignments.filter(a => a.status === 'Active').length,
            topPerformers,
            averageCompletionRate: topPerformers.length > 0 ?
                topPerformers.reduce((sum, v) => sum + v.completionRate, 0) / topPerformers.length : 0
        };
    }

    private generateRecentActivities(assignments: AssignmentResponse[]): DashboardActivity[] {
        const activities: DashboardActivity[] = [];

        assignments.slice(0, 10).forEach(assignment => {
            activities.push({
                id: assignment.id,
                type: 'assignment_created',
                title: `New Assignment Created`,
                description: `Assignment "${assignment.name}" created for ${assignment.vendorName}`,
                timestamp: assignment.createdDt.toString(),
                userId: assignment.assignedBy,
                userName: assignment.assignedByName,
                assignmentId: assignment.id,
                assignmentName: assignment.name
            });
        });

        return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    private generatePendingActions(assignments: AssignmentResponse[]): PendingAction[] {
        const actions: PendingAction[] = [];

        assignments.filter(a => a.status === 'Active').slice(0, 5).forEach(assignment => {
            if (assignment.totalStores > assignment.completedStores) {
                actions.push({
                    id: assignment.id,
                    type: 'status_update',
                    title: 'Assignment Progress Update',
                    description: `Assignment "${assignment.name}" has ${assignment.totalStores - assignment.completedStores} stores pending`,
                    priority: 'medium',
                    assignmentId: assignment.id,
                    assignmentName: assignment.name,
                    vendorId: assignment.vendorId,
                    vendorName: assignment.vendorName
                });
            }
        });

        return actions;
    }

    private calculatePerformanceMetrics(assignments: AssignmentResponse[]): PerformanceMetrics {
        const totalAssignments = assignments.length;
        const completedAssignments = assignments.filter(a => a.status === 'Completed').length;
        const completionRateTrend = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

        return {
            averageAssignmentTime: 0, // TODO: Calculate from actual data
            averageStageTime: 0, // TODO: Calculate from actual data
            completionRateTrend,
            vendorPerformanceTrend: 0, // TODO: Calculate from actual data
            topPerformingRegions: [] // TODO: Calculate from region data
        };
    }
} 
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VendorAssignmentService, VendorAssignment } from '../../services/vendor-assignment.service';
import { VendorHeaderComponent } from '../shared/vendor-header/vendor-header.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-vendor-dashboard',
    standalone: true,
    imports: [CommonModule, VendorHeaderComponent],
    templateUrl: './vendor-dashboard.component.html',
    styleUrl: './vendor-dashboard.component.css'
})
export class VendorDashboardComponent implements OnInit {
    assignments: VendorAssignment[] = [];
    stats = {
        totalAssignments: 0,
        activeAssignments: 0,
        completedAssignments: 0,
        pendingAssignments: 0
    };
    loading = false;

    constructor(
        private router: Router,
        private vendorAssignmentService: VendorAssignmentService
    ) { }

    ngOnInit(): void {
        this.loadAssignments();
    }

    loadAssignments(): void {
        this.loading = true;
        this.vendorAssignmentService.getAssignments().subscribe({
            next: (assignments: VendorAssignment[]) => {
                this.assignments = assignments;
                this.calculateStats();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading assignments:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load assignments.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    calculateStats(): void {
        this.stats.totalAssignments = this.assignments.length;
        this.stats.activeAssignments = this.assignments.filter(a => a.status === 'Active').length;
        this.stats.completedAssignments = this.assignments.filter(a => a.status === 'Completed').length;
        this.stats.pendingAssignments = this.assignments.filter(a => a.status === 'Pending').length;
    }

    getProgressPercentage(assignment: VendorAssignment): number {
        if (assignment.totalStores === 0) return 0;
        return Math.round((assignment.completedStores / assignment.totalStores) * 100 * 100) / 100;
    }

    getStatusColor(status: string): string {
        switch (status.toLowerCase()) {
            case 'active':
                return 'primary';
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            default:
                return 'secondary';
        }
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    viewAssignment(assignmentId: number): void {
        this.router.navigate(['/vendor-assignments', assignmentId]);
    }
} 
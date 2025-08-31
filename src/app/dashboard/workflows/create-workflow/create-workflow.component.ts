import { Component, OnInit, AfterViewInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkflowService, WorkflowCreateRequest, WorkflowStageRequest, WorkflowResponse, WorkflowStageResponse } from '../../../services/workflow.service';
import { RoleService, Role } from '../../../services/role.service';

@Component({
    selector: 'app-create-workflow',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './create-workflow.component.html',
    styleUrl: './create-workflow.component.css',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateWorkflowComponent implements OnInit, AfterViewInit {
    workflowForm: FormGroup;
    stages: WorkflowStageRequest[] = [];
    roles: Role[] = [];
    loading = false;
    isSubmitting = false;
    isEditMode = false;
    workflowId: number | null = null;
    existingWorkflow: WorkflowResponse | null = null;
    existingStages: WorkflowStageResponse[] = [];
    rolesLoaded = false;
    stagesLoaded = false;

    constructor(
        private workflowService: WorkflowService,
        private roleService: RoleService,
        private router: Router,
        private route: ActivatedRoute,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        this.workflowForm = this.fb.group({
            name: ['', [Validators.required]],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.loadRoles();
        this.checkEditMode();
    }

    ngAfterViewInit(): void {
        // Ensure proper preselection after view is initialized
        if (this.isEditMode && this.rolesLoaded && this.stagesLoaded) {
            this.ensureProperPreselection();
        }
    }

    checkEditMode(): void {
        // Check if we're in edit mode by looking at the route
        const url = this.router.url;
        if (url.includes('/edit')) {
            this.isEditMode = true;
            // Extract workflow ID from URL
            const urlParts = url.split('/');
            const idIndex = urlParts.findIndex(part => part === 'workflows') + 1;
            if (idIndex < urlParts.length) {
                this.workflowId = parseInt(urlParts[idIndex]);
                this.loadWorkflowForEdit();
            }
        }
    }

    loadWorkflowForEdit(): void {
        if (!this.workflowId) return;

        this.loading = true;
        this.workflowService.getWorkflow(this.workflowId).subscribe({
            next: (workflow) => {
                this.existingWorkflow = workflow;
                this.workflowForm.patchValue({
                    name: workflow.name,
                    description: workflow.description || ''
                });
                this.loadWorkflowStages();
            },
            error: (error) => {
                console.error('Error loading workflow:', error);
                this.loading = false;
            }
        });
    }

    loadWorkflowStages(): void {
        if (!this.workflowId) return;

        this.workflowService.getStages(this.workflowId).subscribe({
            next: (stages) => {
                this.existingStages = stages;
                // Convert existing stages to WorkflowStageRequest format
                // Set isFinalStage based on position (last stage is final)
                this.stages = stages.map((stage, index) => ({
                    stageName: stage.stageName,
                    stageOrder: stage.stageOrder,
                    roleRequired: stage.roleRequired,
                    isFinalStage: index === stages.length - 1 // Last stage is final
                }));
                this.stagesLoaded = true;
                this.loading = false;

                // Ensure proper preselection after both roles and stages are loaded
                if (this.rolesLoaded) {
                    setTimeout(() => {
                        this.ensureProperPreselection();
                    }, 100);
                }
            },
            error: (error) => {
                console.error('Error loading workflow stages:', error);
                this.loading = false;
            }
        });
    }

    loadRoles(): void {
        this.roleService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles;
                this.rolesLoaded = true;

                // If we're in edit mode and stages are already loaded, ensure preselection
                if (this.isEditMode && this.stagesLoaded) {
                    setTimeout(() => {
                        this.ensureProperPreselection();
                    }, 100);
                }
            },
            error: (error) => {
                console.error('Error loading roles:', error);
                // Fallback to empty array if API call fails
                this.roles = [];
                this.rolesLoaded = true;
            }
        });
    }

    ensureProperPreselection(): void {
        // Force change detection to ensure DOM is updated
        this.cdr.detectChanges();

        // Additional delay to ensure DOM elements are fully rendered
        setTimeout(() => {
            // The preselection should now work properly with ngModel
            this.cdr.detectChanges();
        }, 50);
    }

    addStage(): void {
        const newStage: WorkflowStageRequest = {
            stageName: '',
            stageOrder: this.stages.length + 1,
            roleRequired: 0,
            isFinalStage: false // Will be updated by updateFinalStage()
        };
        this.stages.push(newStage);
        this.updateFinalStage();
    }

    removeStage(index: number): void {
        this.stages.splice(index, 1);
        // Update stage orders
        this.stages.forEach((stage, i) => {
            stage.stageOrder = i + 1;
        });
        this.updateFinalStage();
    }

    moveStageUp(index: number): void {
        if (index > 0) {
            const temp = this.stages[index];
            this.stages[index] = this.stages[index - 1];
            this.stages[index - 1] = temp;
            // Update stage orders
            this.stages.forEach((stage, i) => {
                stage.stageOrder = i + 1;
            });
            this.updateFinalStage();
        }
    }

    moveStageDown(index: number): void {
        if (index < this.stages.length - 1) {
            const temp = this.stages[index];
            this.stages[index] = this.stages[index + 1];
            this.stages[index + 1] = temp;
            // Update stage orders
            this.stages.forEach((stage, i) => {
                stage.stageOrder = i + 1;
            });
            this.updateFinalStage();
        }
    }

    updateFinalStage(): void {
        // Set the last stage as the final stage
        this.stages.forEach((stage, index) => {
            stage.isFinalStage = index === this.stages.length - 1;
        });
    }

    onSubmit(): void {
        if (this.workflowForm.invalid || this.stages.length === 0) {
            return;
        }

        // Validate stages
        const invalidStages = this.stages.filter(stage =>
            !stage.stageName.trim() || stage.roleRequired === 0
        );
        if (invalidStages.length > 0) {
            alert('Please fill in all stage names and select roles for all stages.');
            return;
        }

        // Ensure final stage is set correctly before submitting
        this.updateFinalStage();

        this.isSubmitting = true;
        const formData = this.workflowForm.value;

        if (this.isEditMode && this.workflowId) {
            this.updateWorkflow(formData);
        } else {
            this.createWorkflow(formData);
        }
    }

    createWorkflow(formData: any): void {
        const request: WorkflowCreateRequest = {
            name: formData.name,
            description: formData.description,
            stages: this.stages
        };

        this.workflowService.createWorkflow(request).subscribe({
            next: (workflow) => {
                // Navigate to the view page of the created workflow
                this.router.navigate(['/workflows', workflow.id]);
            },
            error: (error) => {
                console.error('Error creating workflow:', error);
                this.isSubmitting = false;
            }
        });
    }

    updateWorkflow(formData: any): void {
        if (!this.workflowId) return;

        // First update the workflow basic info
        this.workflowService.updateWorkflow(this.workflowId, {
            name: formData.name,
            description: formData.description
        }).subscribe({
            next: () => {
                this.updateWorkflowStages();
            },
            error: (error) => {
                console.error('Error updating workflow:', error);
                this.isSubmitting = false;
            }
        });
    }

    updateWorkflowStages(): void {
        if (!this.workflowId) return;

        // For simplicity, we'll delete all existing stages and create new ones
        // In a production environment, you might want to implement more sophisticated
        // stage management (update existing, delete removed, add new)

        // First, delete all existing stages
        const deletePromises = this.existingStages.map(stage =>
            this.workflowService.deleteStage(this.workflowId!, stage.id).toPromise()
        );

        Promise.all(deletePromises).then(() => {
            // Then create new stages
            const createPromises = this.stages.map(stage =>
                this.workflowService.createStage(this.workflowId!, stage).toPromise()
            );

            Promise.all(createPromises).then(() => {
                // Navigate to the view page of the updated workflow
                this.router.navigate(['/workflows', this.workflowId]);
            }).catch(error => {
                console.error('Error creating stages:', error);
                this.isSubmitting = false;
            });
        }).catch(error => {
            console.error('Error deleting stages:', error);
            this.isSubmitting = false;
        });
    }

    cancel(): void {
        this.router.navigate(['/workflows']);
    }
} 
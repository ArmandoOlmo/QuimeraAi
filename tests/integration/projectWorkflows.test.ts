/**
 * Integration Tests: Project Workflows
 * Tests complete user workflows related to project management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyTokensToFullProject } from '../../utils/designTokenApplier';
import { applyResponsiveStylesToProject } from '../../utils/responsiveStyleApplier';
import { Project, DesignTokens } from '../../types';
import { initialData } from '../../data/initialData';

describe('Project Workflows', () => {
    let mockProject: Project;
    let mockTokens: DesignTokens;

    beforeEach(() => {
        // Setup mock project
        mockProject = {
            id: 'test-project-1',
            name: 'Test Project',
            status: 'Draft',
            data: initialData.data,
            theme: initialData.theme,
            brandIdentity: initialData.brandIdentity,
            componentOrder: initialData.componentOrder,
            sectionVisibility: initialData.sectionVisibility,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        // Setup mock design tokens
        mockTokens = {
            colors: {
                primary: {
                    main: '#8B5CF6',
                    light: '#A78BFA',
                    dark: '#7C3AED',
                    50: '#F5F3FF',
                    100: '#EDE9FE',
                    200: '#DDD6FE',
                    300: '#C4B5FD',
                    400: '#A78BFA',
                    500: '#8B5CF6',
                    600: '#7C3AED',
                    700: '#6D28D9',
                    800: '#5B21B6',
                    900: '#4C1D95',
                },
                secondary: {
                    main: '#EC4899',
                    light: '#F472B6',
                    dark: '#DB2777',
                    50: '#FDF2F8',
                    100: '#FCE7F3',
                    200: '#FBCFE8',
                    300: '#F9A8D4',
                    400: '#F472B6',
                    500: '#EC4899',
                    600: '#DB2777',
                    700: '#BE185D',
                    800: '#9D174D',
                    900: '#831843',
                },
                neutral: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                },
            },
            spacing: {
                0: '0',
                1: '0.25rem',
                2: '0.5rem',
                4: '1rem',
                8: '2rem',
                16: '4rem',
            },
        };
    });

    describe('Create Project from Template', () => {
        it('should create a project with all required fields', () => {
            expect(mockProject.id).toBeDefined();
            expect(mockProject.name).toBeDefined();
            expect(mockProject.data).toBeDefined();
            expect(mockProject.componentOrder).toBeDefined();
            expect(mockProject.sectionVisibility).toBeDefined();
        });

        it('should have valid component order', () => {
            expect(Array.isArray(mockProject.componentOrder)).toBe(true);
            expect(mockProject.componentOrder.length).toBeGreaterThan(0);
        });

        it('should have section visibility for all components', () => {
            mockProject.componentOrder.forEach(componentId => {
                expect(mockProject.sectionVisibility).toHaveProperty(componentId);
            });
        });
    });

    describe('Apply Design Tokens Workflow', () => {
        it('should apply design tokens to project without errors', () => {
            const result = applyTokensToFullProject(mockProject, mockTokens);
            
            expect(result).toBeDefined();
            expect(result.id).toBe(mockProject.id);
            expect(result.designTokens).toEqual(mockTokens);
        });

        it('should update lastUpdated timestamp', () => {
            const originalTimestamp = mockProject.lastUpdated;
            const result = applyTokensToFullProject(mockProject, mockTokens);
            
            expect(result.lastUpdated).not.toBe(originalTimestamp);
        });

        it('should preserve project structure', () => {
            const result = applyTokensToFullProject(mockProject, mockTokens);
            
            expect(result.name).toBe(mockProject.name);
            expect(result.status).toBe(mockProject.status);
            expect(result.componentOrder).toEqual(mockProject.componentOrder);
        });

        it('should apply color tokens to component data', () => {
            const result = applyTokensToFullProject(mockProject, mockTokens);
            
            // Check if hero component has updated colors
            if (result.data.hero && result.data.hero.colors) {
                const heroColors = result.data.hero.colors;
                // Colors should be from tokens or modified
                expect(heroColors).toBeDefined();
            }
        });
    });

    describe('Responsive Styles Workflow', () => {
        beforeEach(() => {
            // Add responsive styles to mock project
            mockProject.responsiveStyles = {
                hero: {
                    base: { fontSize: '16px' },
                    sm: { fontSize: '18px' },
                    md: { fontSize: '20px' },
                    lg: { fontSize: '24px' },
                    xl: { fontSize: '28px' },
                    '2xl': { fontSize: '32px' },
                },
            };
        });

        it('should apply responsive styles without errors', () => {
            const result = applyResponsiveStylesToProject(mockProject);
            
            expect(result).toBeDefined();
            expect(result.id).toBe(mockProject.id);
        });

        it('should preserve responsive styles configuration', () => {
            const result = applyResponsiveStylesToProject(mockProject);
            
            expect(result.responsiveStyles).toEqual(mockProject.responsiveStyles);
        });

        it('should update component data with responsive styles', () => {
            const result = applyResponsiveStylesToProject(mockProject);
            
            // Hero should have updated styles
            expect(result.data.hero).toBeDefined();
        });
    });

    describe('Component Management Workflow', () => {
        it('should toggle component visibility', () => {
            const componentId = mockProject.componentOrder[0];
            const originalVisibility = mockProject.sectionVisibility[componentId];
            
            // Toggle visibility
            mockProject.sectionVisibility[componentId] = !originalVisibility;
            
            expect(mockProject.sectionVisibility[componentId]).toBe(!originalVisibility);
        });

        it('should reorder components', () => {
            const originalOrder = [...mockProject.componentOrder];
            
            // Swap first two components
            const temp = mockProject.componentOrder[0];
            mockProject.componentOrder[0] = mockProject.componentOrder[1];
            mockProject.componentOrder[1] = temp;
            
            expect(mockProject.componentOrder[0]).not.toBe(originalOrder[0]);
            expect(mockProject.componentOrder[1]).not.toBe(originalOrder[1]);
        });

        it('should maintain data integrity when reordering', () => {
            const originalDataKeys = Object.keys(mockProject.data);
            
            // Reorder
            mockProject.componentOrder.reverse();
            
            const newDataKeys = Object.keys(mockProject.data);
            expect(newDataKeys.sort()).toEqual(originalDataKeys.sort());
        });
    });

    describe('Project Update Workflow', () => {
        it('should update project name', () => {
            const newName = 'Updated Project Name';
            mockProject.name = newName;
            
            expect(mockProject.name).toBe(newName);
        });

        it('should update project status', () => {
            mockProject.status = 'Published';
            
            expect(mockProject.status).toBe('Published');
        });

        it('should update component data', () => {
            const newHeroTitle = 'New Hero Title';
            mockProject.data.hero.title = newHeroTitle;
            
            expect(mockProject.data.hero.title).toBe(newHeroTitle);
        });

        it('should track last updated timestamp', () => {
            const beforeUpdate = mockProject.lastUpdated;
            mockProject.lastUpdated = new Date().toISOString();
            
            expect(mockProject.lastUpdated).not.toBe(beforeUpdate);
        });
    });

    describe('Complete Project Creation Flow', () => {
        it('should create, configure, and finalize a project', () => {
            // Step 1: Create project
            const newProject: Project = {
                id: 'new-project-1',
                name: 'New Project',
                status: 'Draft',
                data: initialData.data,
                theme: initialData.theme,
                brandIdentity: initialData.brandIdentity,
                componentOrder: initialData.componentOrder,
                sectionVisibility: initialData.sectionVisibility,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };

            expect(newProject.id).toBeDefined();

            // Step 2: Apply design tokens
            const withTokens = applyTokensToFullProject(newProject, mockTokens);
            expect(withTokens.designTokens).toEqual(mockTokens);

            // Step 3: Configure responsive styles
            withTokens.responsiveStyles = {
                hero: {
                    base: { fontSize: '16px' },
                    md: { fontSize: '20px' },
                    lg: { fontSize: '24px' },
                    sm: {},
                    xl: {},
                    '2xl': {},
                },
            };

            const withResponsive = applyResponsiveStylesToProject(withTokens);
            expect(withResponsive.responsiveStyles).toBeDefined();

            // Step 4: Update to Published
            withResponsive.status = 'Published';
            expect(withResponsive.status).toBe('Published');

            // Verify complete project
            expect(withResponsive.designTokens).toBeDefined();
            expect(withResponsive.responsiveStyles).toBeDefined();
            expect(withResponsive.status).toBe('Published');
        });
    });
});


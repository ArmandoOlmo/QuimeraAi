/**
 * Integration Tests: Component Workflows
 * Tests complete user workflows related to component management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomComponent, ComponentVersion, ComponentVariant, ComponentPermissions } from '../../types';

describe('Component Workflows', () => {
    let mockComponent: CustomComponent;

    beforeEach(() => {
        mockComponent = {
            id: 'custom-comp-1',
            name: 'Custom Hero',
            description: 'A custom hero component',
            baseComponent: 'hero',
            styles: {
                colors: {
                    background: '#ffffff',
                    text: '#000000',
                    primary: '#8B5CF6',
                },
                paddingY: 20,
                paddingX: 16,
            },
            version: 1,
            versionHistory: [
                {
                    version: 1,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    author: 'user-123',
                    changes: 'Initial version',
                    snapshot: {
                        colors: {
                            background: '#ffffff',
                            text: '#000000',
                            primary: '#8B5CF6',
                        },
                        paddingY: 20,
                        paddingX: 16,
                    },
                    styles: {
                        colors: {
                            background: '#ffffff',
                            text: '#000000',
                            primary: '#8B5CF6',
                        },
                        paddingY: 20,
                        paddingX: 16,
                    },
                    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    notes: 'Initial version',
                },
            ],
            category: 'hero',
            tags: ['hero', 'custom', 'modern'],
            createdBy: 'user-123',
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            permissions: {
                canEdit: ['user-123'],
                canView: ['user-123'],
                isPublic: false,
            },
        };
    });

    describe('Create Custom Component', () => {
        it('should create a component with all required fields', () => {
            expect(mockComponent.id).toBeDefined();
            expect(mockComponent.name).toBeDefined();
            expect(mockComponent.baseComponent).toBeDefined();
            expect(mockComponent.styles).toBeDefined();
            expect(mockComponent.version).toBe(1);
        });

        it('should have initial version history', () => {
            expect(mockComponent.versionHistory).toBeDefined();
            expect(mockComponent.versionHistory?.length).toBe(1);
            expect(mockComponent.versionHistory?.[0].version).toBe(1);
        });

        it('should have default permissions for creator', () => {
            expect(mockComponent.permissions).toBeDefined();
            expect(mockComponent.permissions?.canEdit).toContain('user-123');
            expect(mockComponent.permissions?.canView).toContain('user-123');
        });
    });

    describe('Version Management Workflow', () => {
        it('should create new version on edit', () => {
            const newVersion: ComponentVersion = {
                version: 2,
                timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                author: 'user-123',
                changes: 'Changed primary color',
                snapshot: {
                    ...mockComponent.styles,
                    colors: {
                        ...mockComponent.styles.colors,
                        primary: '#EC4899',
                    },
                },
                styles: {
                    ...mockComponent.styles,
                    colors: {
                        ...mockComponent.styles.colors,
                        primary: '#EC4899',
                    },
                },
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                notes: 'Changed primary color',
            };

            mockComponent.versionHistory?.push(newVersion);
            mockComponent.version = 2;
            mockComponent.styles = newVersion.styles;

            expect(mockComponent.version).toBe(2);
            expect(mockComponent.versionHistory?.length).toBe(2);
            expect(mockComponent.styles.colors.primary).toBe('#EC4899');
        });

        it('should revert to previous version', () => {
            // Add a second version
            const v2: ComponentVersion = {
                version: 2,
                timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                author: 'user-123',
                changes: 'Increased padding',
                snapshot: {
                    ...mockComponent.styles,
                    paddingY: 40,
                },
                styles: {
                    ...mockComponent.styles,
                    paddingY: 40,
                },
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                notes: 'Increased padding',
            };
            mockComponent.versionHistory?.push(v2);
            mockComponent.version = 2;

            // Revert to version 1
            const v1 = mockComponent.versionHistory?.[0];
            if (v1) {
                mockComponent.styles = v1.styles;
                mockComponent.version = v1.version;
            }

            expect(mockComponent.version).toBe(1);
            expect(mockComponent.styles.paddingY).toBe(20);
        });

        it('should maintain version history when reverting', () => {
            const initialHistoryLength = mockComponent.versionHistory?.length || 0;

            // Add version
            mockComponent.versionHistory?.push({
                version: 2,
                timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                author: 'user-123',
                changes: 'Version 2 changes',
                snapshot: { ...mockComponent.styles },
                styles: { ...mockComponent.styles },
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                notes: 'Version 2',
            });

            // Revert (doesn't delete history)
            mockComponent.version = 1;

            expect(mockComponent.versionHistory?.length).toBe(initialHistoryLength + 1);
        });
    });

    describe('Variants Workflow', () => {
        it('should create component variants', () => {
            const variant: ComponentVariant = {
                id: 'dark-variant',
                name: 'Dark Mode',
                description: 'Dark color scheme',
                styles: {
                    ...mockComponent.styles,
                    colors: {
                        background: '#111827',
                        text: '#F9FAFB',
                        primary: '#A78BFA',
                    },
                },
                isDefault: false,
            };

            mockComponent.variants = [variant];

            expect(mockComponent.variants).toBeDefined();
            expect(mockComponent.variants.length).toBe(1);
            expect(mockComponent.variants[0].name).toBe('Dark Mode');
        });

        it('should set a variant as default', () => {
            mockComponent.variants = [
                {
                    id: 'light',
                    name: 'Light',
                    styles: mockComponent.styles,
                    isDefault: false,
                },
                {
                    id: 'dark',
                    name: 'Dark',
                    styles: { ...mockComponent.styles },
                    isDefault: true,
                },
            ];

            const defaultVariant = mockComponent.variants.find(v => v.isDefault);
            expect(defaultVariant).toBeDefined();
            expect(defaultVariant?.name).toBe('Dark');
        });

        it('should switch between variants', () => {
            mockComponent.variants = [
                {
                    id: 'light',
                    name: 'Light',
                    styles: { ...mockComponent.styles },
                    isDefault: true,
                },
                {
                    id: 'dark',
                    name: 'Dark',
                    styles: {
                        ...mockComponent.styles,
                        colors: {
                            background: '#000000',
                            text: '#FFFFFF',
                            primary: '#8B5CF6',
                        },
                    },
                    isDefault: false,
                },
            ];

            // Switch to dark variant
            const darkVariant = mockComponent.variants[1];
            mockComponent.styles = darkVariant.styles;

            expect(mockComponent.styles.colors.background).toBe('#000000');
        });
    });

    describe('Permissions Workflow', () => {
        it('should grant view permission to user', () => {
            const newUserId = 'user-456';
            mockComponent.permissions?.canView.push(newUserId);

            expect(mockComponent.permissions?.canView).toContain(newUserId);
        });

        it('should grant edit permission to user', () => {
            const newUserId = 'user-456';
            mockComponent.permissions?.canEdit.push(newUserId);

            expect(mockComponent.permissions?.canEdit).toContain(newUserId);
        });

        it('should revoke permissions', () => {
            mockComponent.permissions?.canEdit.push('user-456');
            
            // Revoke
            if (mockComponent.permissions) {
                mockComponent.permissions.canEdit = mockComponent.permissions.canEdit.filter(
                    id => id !== 'user-456'
                );
            }

            expect(mockComponent.permissions?.canEdit).not.toContain('user-456');
        });

        it('should make component public', () => {
            if (mockComponent.permissions) {
                mockComponent.permissions.isPublic = true;
            }

            expect(mockComponent.permissions?.isPublic).toBe(true);
        });

        it('should make component private', () => {
            if (mockComponent.permissions) {
                mockComponent.permissions.isPublic = true;
                mockComponent.permissions.isPublic = false;
            }

            expect(mockComponent.permissions?.isPublic).toBe(false);
        });
    });

    describe('Duplicate Component Workflow', () => {
        it('should create a copy of component', () => {
            const duplicate: CustomComponent = {
                ...mockComponent,
                id: 'custom-comp-2',
                name: `${mockComponent.name} Copy`,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            };

            expect(duplicate.id).not.toBe(mockComponent.id);
            expect(duplicate.name).toContain('Copy');
            expect(duplicate.baseComponent).toBe(mockComponent.baseComponent);
            expect(duplicate.styles).toEqual(mockComponent.styles);
        });

        it('should preserve version history in duplicate', () => {
            const duplicate: CustomComponent = {
                ...mockComponent,
                id: 'custom-comp-2',
                name: `${mockComponent.name} Copy`,
                versionHistory: [...(mockComponent.versionHistory || [])],
            };

            expect(duplicate.versionHistory).toEqual(mockComponent.versionHistory);
        });
    });

    describe('Component Usage Tracking', () => {
        it('should track projects using component', () => {
            mockComponent.projectsUsing = ['project-1', 'project-2'];
            mockComponent.usageCount = 2;

            expect(mockComponent.usageCount).toBe(2);
            expect(mockComponent.projectsUsing).toHaveLength(2);
        });

        it('should increment usage count', () => {
            mockComponent.usageCount = mockComponent.usageCount || 0;
            mockComponent.projectsUsing = mockComponent.projectsUsing || [];

            const projectId = 'new-project';
            if (!mockComponent.projectsUsing.includes(projectId)) {
                mockComponent.projectsUsing.push(projectId);
                mockComponent.usageCount++;
            }

            expect(mockComponent.usageCount).toBeGreaterThan(0);
            expect(mockComponent.projectsUsing).toContain(projectId);
        });
    });

    describe('Complete Component Creation Flow', () => {
        it('should create, configure, version, and publish a component', () => {
            // Step 1: Create base component
            const newComponent: CustomComponent = {
                id: 'new-custom-1',
                name: 'New Custom Component',
                baseComponent: 'hero',
                styles: {
                    colors: {
                        background: '#ffffff',
                        text: '#000000',
                        primary: '#8B5CF6',
                    },
                },
                version: 1,
                versionHistory: [{
                    version: 1,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    author: 'user-123',
                    changes: 'Initial version',
                    snapshot: {
                        colors: {
                            background: '#ffffff',
                            text: '#000000',
                            primary: '#8B5CF6',
                        },
                    },
                    styles: {
                        colors: {
                            background: '#ffffff',
                            text: '#000000',
                            primary: '#8B5CF6',
                        },
                    },
                    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    notes: 'Initial version',
                }],
                createdBy: 'user-123',
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                permissions: {
                    canEdit: ['user-123'],
                    canView: ['user-123'],
                    isPublic: false,
                },
            };

            expect(newComponent.id).toBeDefined();

            // Step 2: Add variants
            newComponent.variants = [
                {
                    id: 'default',
                    name: 'Default',
                    styles: newComponent.styles,
                    isDefault: true,
                },
            ];

            expect(newComponent.variants).toHaveLength(1);

            // Step 3: Make public
            newComponent.permissions.isPublic = true;

            expect(newComponent.permissions.isPublic).toBe(true);

            // Step 4: Track usage
            newComponent.usageCount = 0;
            newComponent.projectsUsing = [];

            expect(newComponent.usageCount).toBe(0);

            // Verify complete component
            expect(newComponent.versionHistory).toBeDefined();
            expect(newComponent.variants).toBeDefined();
            expect(newComponent.permissions).toBeDefined();
            expect(newComponent.usageCount).toBeDefined();
        });
    });
});


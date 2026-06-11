/**
 * useEditorComponents.ts
 * Extracted from EditorContext.tsx — Component Studio: styles, custom components, design tokens
 */
import { useState } from 'react';
import {
    ComponentStyles, EditableComponentID, CustomComponent, PageSection,
    ComponentVariant, ComponentVersion, DesignTokens
} from '../../types';
import { componentStyles as defaultComponentStyles } from '../../data/componentStyles';
import { supabase } from '../../supabase';
import type { User } from '@supabase/supabase-js';

interface UseEditorComponentsParams {
    user: User | null;
    userRole: string;
}

export const useEditorComponents = ({ user, userRole }: UseEditorComponentsParams) => {
    // Component Studio State
    const [componentStyles, setComponentStyles] = useState<ComponentStyles>(defaultComponentStyles);
    const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);
    const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);
    const [componentStatus, setComponentStatus] = useState<Record<PageSection, boolean>>({} as Record<PageSection, boolean>);

    // Helper to format custom component from db
    const formatCustomComponent = (d: any): CustomComponent => ({
        id: d.id,
        name: d.name,
        baseComponent: d.base_component as any,
        styles: d.styles,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        createdBy: d.created_by,
        isPublic: d.is_public,
        usageCount: d.usage_count,
        versions: d.versions || [],
        variants: d.variants || [],
        activeVariant: d.active_variant,
        projectsUsing: d.projects_using || []
    });

    // ─── Listeners ───

    const setupComponentDefaultsListener = () => {
        const fetchDefaults = async () => {
            const { data } = await supabase.from('component_defaults').select('*');
            if (data) {
                const loadedStyles: any = {};
                data.forEach((doc) => {
                    loadedStyles[doc.id] = doc.styles;
                });
                if (Object.keys(loadedStyles).length > 0) {
                    setComponentStyles(prev => ({ ...prev, ...loadedStyles }));
                    console.log("✅ Component defaults updated in real-time");
                }
            }
        };
        fetchDefaults();

        const channel = supabase.channel('public:component_defaults')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'component_defaults' }, () => {
                fetchDefaults();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const setupCustomComponentsListener = () => {
        const fetchCustom = async () => {
            const { data } = await supabase.from('custom_components').select('*').order('created_at', { ascending: false });
            if (data) {
                setCustomComponents(data.map(formatCustomComponent));
                console.log("✅ Custom components updated in real-time:", data.length);
            }
        };
        fetchCustom();

        const channel = supabase.channel('public:custom_components')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_components' }, () => {
                fetchCustom();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    // ─── Component Style Management ───

    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        if (!['superadmin', 'admin', 'manager', 'owner'].includes(userRole)) {
            return;
        }

        if (isCustom) {
            setCustomComponents(prev => prev.map(c => c.id === componentId ? { ...c, styles: { ...c.styles, ...newStyles } } : c));
        } else {
            setComponentStyles(prev => {
                const currentStyles = prev[componentId as EditableComponentID];
                return {
                    ...prev,
                    [componentId]: { ...currentStyles, ...newStyles }
                };
            });
        }
    };

    const saveComponent = async (componentId: string, changeDescription?: string) => {
        try {
            const customComp = customComponents.find(c => c.id === componentId);
            if (customComp) {
                const newVersion: ComponentVersion = {
                    version: ((customComp.versions?.length || 0) > 0 ? Math.max(...(customComp.versions || []).map(v => v.version)) : 0) + 1,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 } as any, // Supabase legacy format? Let's keep compatible if needed or switch to ISO string
                    author: user?.id || 'unknown',
                    changes: changeDescription || 'Component updated',
                    snapshot: customComp.styles
                };

                const updatedVersionHistory = [
                    ...(customComp.versions || []),
                    newVersion
                ].slice(-10);

                await supabase.from('custom_components').update({
                    styles: customComp.styles,
                    versions: updatedVersionHistory,
                    updated_at: new Date().toISOString()
                }).eq('id', componentId);

                setCustomComponents(prev => prev.map(c =>
                    c.id === componentId
                        ? {
                            ...c,
                            versions: updatedVersionHistory,
                            updatedAt: new Date().toISOString()
                        }
                        : c
                ));
                console.log("Saved custom component", componentId);
                return;
            }

            const currentStyle = componentStyles[componentId as EditableComponentID];
            if (currentStyle) {
                await supabase.from('component_defaults').upsert({
                    id: componentId,
                    styles: currentStyle,
                    updated_at: new Date().toISOString()
                });
                console.log("Saved standard component", componentId);
            }
        } catch (e) {
            console.error("Error saving component:", e);
            throw e;
        }
    };

    const createNewCustomComponent = async (name: string, baseComponent: EditableComponentID): Promise<CustomComponent> => {
        try {
            const now = new Date().toISOString();
            const insertData = {
                name,
                base_component: baseComponent,
                styles: componentStyles[baseComponent],
                created_at: now,
                updated_at: now,
                created_by: user?.id || null,
                is_public: false,
                usage_count: 0,
                versions: [],
                variants: [],
                projects_using: []
            };

            const { data, error } = await supabase.from('custom_components').insert([insertData]).select('*').single();
            if (error) throw error;

            const createdComponent = formatCustomComponent(data);
            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error creating custom component:", error);
            throw error;
        }
    };

    const deleteCustomComponent = async (componentId: string): Promise<void> => {
        try {
            await supabase.from('custom_components').delete().eq('id', componentId);
            setCustomComponents(prev => prev.filter(c => c.id !== componentId));
        } catch (error) {
            console.error("Error deleting custom component:", error);
            throw error;
        }
    };

    const duplicateComponent = async (componentId: string): Promise<CustomComponent> => {
        const original = customComponents.find(c => c.id === componentId);
        if (!original) throw new Error('Component not found');

        try {
            const now = new Date().toISOString();
            const duplicateData = {
                name: `${original.name} Copy`,
                base_component: original.baseComponent,
                styles: original.styles,
                created_at: now,
                updated_at: now,
                created_by: user?.id || null,
                is_public: false,
                usage_count: 0,
                versions: [],
                variants: original.variants || [],
                projects_using: []
            };

            const { data, error } = await supabase.from('custom_components').insert([duplicateData]).select('*').single();
            if (error) throw error;

            const newComponent = formatCustomComponent(data);
            setCustomComponents(prev => [newComponent, ...prev]);
            return newComponent;
        } catch (error) {
            console.error("Error duplicating component:", error);
            throw error;
        }
    };

    const renameCustomComponent = async (componentId: string, newName: string): Promise<void> => {
        if (!['owner', 'superadmin', 'admin', 'manager'].includes(userRole)) {
            throw new Error("Only administrators and managers can rename components.");
        }
        if (!newName.trim()) throw new Error("Component name cannot be empty.");

        try {
            await supabase.from('custom_components').update({
                name: newName.trim(),
                updated_at: new Date().toISOString()
            }).eq('id', componentId);

            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, name: newName.trim(), updatedAt: new Date().toISOString() }
                    : c
            ));
        } catch (error) {
            console.error("Error renaming component:", error);
            throw error;
        }
    };

    const updateComponentVariants = async (componentId: string, variants: ComponentVariant[], activeVariant?: string): Promise<void> => {
        try {
            const updateData: any = { variants, updated_at: new Date().toISOString() };
            if (activeVariant !== undefined) updateData.active_variant = activeVariant;

            await supabase.from('custom_components').update(updateData).eq('id', componentId);

            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, variants, activeVariant: activeVariant ?? c.activeVariant, updatedAt: new Date().toISOString() }
                    : c
            ));
        } catch (error) {
            console.error("Error updating component variants:", error);
            throw error;
        }
    };

    const exportComponent = (componentId: string): string => {
        const component = customComponents.find(c => c.id === componentId);
        if (!component) throw new Error('Component not found');

        return JSON.stringify({
            name: component.name,
            baseComponent: component.baseComponent, 
            styles: component.styles,
            variants: component.variants,
            versions: component.versions,
        }, null, 2);
    };

    const importComponent = async (jsonString: string): Promise<CustomComponent> => {
        try {
            const importedData = JSON.parse(jsonString);
            if (!importedData.name || !importedData.baseComponent) {
                throw new Error('Invalid component data: missing required fields');
            }

            const now = new Date().toISOString();
            const newComponentData = {
                name: importedData.name,
                base_component: importedData.baseComponent, 
                styles: importedData.styles || {},
                versions: importedData.versions || [],
                variants: importedData.variants || [], 
                is_public: false,
                created_by: user?.id || null, 
                usage_count: 0, 
                projects_using: [],
                created_at: now, 
                updated_at: now
            };

            const { data, error } = await supabase.from('custom_components').insert([newComponentData]).select('*').single();
            if (error) throw error;

            const createdComponent = formatCustomComponent(data);
            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error importing component:", error);
            throw error;
        }
    };

    const revertToVersion = async (componentId: string, versionNumber: number): Promise<void> => {
        const component = customComponents.find(c => c.id === componentId);
        if (!component) throw new Error('Component not found');

        const targetVersion = component.versions?.find(v => v.version === versionNumber);
        if (!targetVersion) throw new Error('Version not found');

        await supabase.from('custom_components').update({
            styles: targetVersion.snapshot,
            updated_at: new Date().toISOString()
        }).eq('id', componentId);

        setCustomComponents(prev => prev.map(c =>
            c.id === componentId
                ? { ...c, styles: targetVersion.snapshot, updatedAt: new Date().toISOString() }
                : c
        ));
    };

    const trackComponentUsage = async (projectId: string, componentIds: string[]): Promise<void> => {
        if (!user) return;

        const customComponentIds = componentIds.filter(id => customComponents.some(c => c.id === id));

        for (const compId of customComponentIds) {
            const component = customComponents.find(c => c.id === compId);
            if (!component) continue;

            const projectsUsing = component.projectsUsing || [];
            if (!projectsUsing.includes(projectId)) {
                try {
                    const updatedProjects = [...projectsUsing, projectId];
                    await supabase.from('custom_components').update({
                        projects_using: updatedProjects,
                        usage_count: updatedProjects.length
                    }).eq('id', compId);
                    
                    setCustomComponents(prev => prev.map(c =>
                        c.id === compId ? { ...c, projectsUsing: updatedProjects, usageCount: updatedProjects.length } : c
                    ));
                } catch (error) {
                    console.error(`Error tracking component usage for ${compId}:`, error);
                }
            }
        }
    };

    // ─── Design Tokens ───

    const updateDesignTokens = async (tokens: DesignTokens): Promise<void> => {
        try {
            await supabase.from('settings').upsert({
                id: 'designTokens',
                config: tokens,
                updated_at: new Date().toISOString(),
                updated_by: user?.id || null
            });
            setDesignTokens(tokens);
        } catch (error) {
            console.error("Error updating design tokens:", error);
            throw error;
        }
    };

    // ─── Component Status ───

    const updateComponentStatus = async (componentId: PageSection, isEnabled: boolean) => {
        const newStatus = { ...componentStatus, [componentId]: isEnabled };
        setComponentStatus(newStatus);
        try {
            await supabase.from('settings').upsert({
                id: 'components',
                config: { status: newStatus },
                updated_at: new Date().toISOString(),
                updated_by: user?.id || null
            });
        } catch (error) {
            console.error('Failed to update component status:', error);
        }
    };

    return {
        componentStyles, setComponentStyles,
        customComponents, setCustomComponents,
        designTokens, setDesignTokens,
        componentStatus, setComponentStatus,
        setupComponentDefaultsListener,
        setupCustomComponentsListener,
        updateComponentStyle, saveComponent,
        createNewCustomComponent, deleteCustomComponent,
        duplicateComponent, renameCustomComponent,
        updateComponentVariants, exportComponent, importComponent,
        revertToVersion, trackComponentUsage,
        updateDesignTokens, updateComponentStatus,
    };
};

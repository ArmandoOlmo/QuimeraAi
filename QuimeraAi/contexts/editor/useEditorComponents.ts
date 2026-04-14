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
import {
    db, doc, setDoc, updateDoc, deleteDoc,
    collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDoc
} from '../../firebase';
import type { User } from '../../firebase';

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

    // ─── Listeners ───

    const setupComponentDefaultsListener = () => {
        try {
            const componentDefaultsCol = collection(db, "componentDefaults");
            const unsubscribe = onSnapshot(componentDefaultsCol, (snapshot) => {
                const loadedStyles: any = {};
                snapshot.forEach((doc) => {
                    loadedStyles[doc.id] = doc.data().styles;
                });
                if (Object.keys(loadedStyles).length > 0) {
                    setComponentStyles(prev => ({ ...prev, ...loadedStyles }));
                    console.log("✅ Component defaults updated in real-time");
                }
            }, (error) => {
                if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
                    console.warn("⚠️ Component defaults listener: waiting for permissions");
                } else {
                    console.error("Error in component defaults listener:", error);
                }
            });
            return unsubscribe;
        } catch (e) {
            console.error("Error setting up component defaults listener:", e);
            return () => { };
        }
    };

    const setupCustomComponentsListener = () => {
        try {
            const customComponentsCol = collection(db, 'customComponents');
            const q = query(customComponentsCol, orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomComponent));
                setCustomComponents(components);
                if (components.length > 0) {
                    console.log("✅ Custom components updated in real-time:", components.length);
                }
            }, (error) => {
                if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
                    console.warn("⚠️ Custom components listener: waiting for index or permissions");
                    setCustomComponents([]);
                } else {
                    console.error("Error in custom components listener:", error);
                }
            });
            return unsubscribe;
        } catch (error) {
            console.error("Error setting up custom components listener:", error);
            return () => { };
        }
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
                    version: (customComp.version || 1) + 1,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    author: user?.uid || 'unknown',
                    changes: changeDescription || 'Component updated',
                    snapshot: customComp.styles
                };

                const updatedVersionHistory = [
                    ...(customComp.versionHistory || []),
                    newVersion
                ].slice(-10);

                const docRef = doc(db, 'customComponents', componentId);
                await updateDoc(docRef, {
                    styles: customComp.styles,
                    version: newVersion.version,
                    versionHistory: updatedVersionHistory,
                    lastModified: serverTimestamp(),
                    modifiedBy: user?.uid || ''
                });

                setCustomComponents(prev => prev.map(c =>
                    c.id === componentId
                        ? {
                            ...c,
                            version: newVersion.version,
                            versionHistory: updatedVersionHistory,
                            lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 },
                            modifiedBy: user?.uid || ''
                        }
                        : c
                ));
                console.log("Saved custom component", componentId);
                return;
            }

            const currentStyle = componentStyles[componentId as EditableComponentID];
            if (currentStyle) {
                const docRef = doc(db, 'componentDefaults', componentId);
                await setDoc(docRef, { styles: currentStyle }, { merge: true });
                console.log("Saved standard component", componentId);
            }
        } catch (e) {
            console.error("Error saving component:", e);
            throw e;
        }
    };

    const createNewCustomComponent = async (name: string, baseComponent: EditableComponentID): Promise<CustomComponent> => {
        const newComponentData: Omit<CustomComponent, 'id' | 'createdAt'> = {
            name, baseComponent,
            styles: componentStyles[baseComponent],
            version: 1, versionHistory: [],
            category: 'other', tags: [], variants: [],
            isPublic: false, createdBy: user?.uid || '',
            usageCount: 0, projectsUsing: [],
            permissions: { canEdit: [], canView: [], isPublic: false }
        };

        try {
            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...newComponentData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const createdComponent: CustomComponent = {
                id: docRef.id, ...newComponentData,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error creating custom component:", error);
            throw error;
        }
    };

    const deleteCustomComponent = async (componentId: string): Promise<void> => {
        try {
            const docRef = doc(db, 'customComponents', componentId);
            await deleteDoc(docRef);
            setCustomComponents(prev => prev.filter(c => c.id !== componentId));
        } catch (error) {
            console.error("Error deleting custom component:", error);
            throw error;
        }
    };

    const duplicateComponent = async (componentId: string): Promise<CustomComponent> => {
        const original = customComponents.find(c => c.id === componentId);
        if (!original) throw new Error('Component not found');

        const duplicateData: Omit<CustomComponent, 'id' | 'createdAt'> = {
            ...original, name: `${original.name} Copy`,
            version: 1, versionHistory: [],
            usageCount: 0, projectsUsing: [],
            createdBy: user?.uid || '',
        };

        try {
            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...duplicateData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const newComponent: CustomComponent = {
                ...duplicateData, id: docRef.id,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

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
            const docRef = doc(db, 'customComponents', componentId);
            await updateDoc(docRef, { name: newName.trim(), lastModified: serverTimestamp(), modifiedBy: user?.uid || '' });
            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, name: newName.trim(), lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 } }
                    : c
            ));
        } catch (error) {
            console.error("Error renaming component:", error);
            throw error;
        }
    };

    const updateComponentVariants = async (componentId: string, variants: ComponentVariant[], activeVariant?: string): Promise<void> => {
        try {
            const updateData: any = { variants, lastModified: serverTimestamp(), modifiedBy: user?.uid || '' };
            if (activeVariant !== undefined) updateData.activeVariant = activeVariant;

            const docRef = doc(db, 'customComponents', componentId);
            await updateDoc(docRef, updateData);
            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, variants, activeVariant: activeVariant ?? c.activeVariant, lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 } }
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
            name: component.name, description: component.description,
            baseComponent: component.baseComponent, styles: component.styles,
            category: component.category, tags: component.tags,
            variants: component.variants, documentation: component.documentation,
            version: component.version,
        }, null, 2);
    };

    const importComponent = async (jsonString: string): Promise<CustomComponent> => {
        try {
            const importedData = JSON.parse(jsonString);
            if (!importedData.name || !importedData.baseComponent) {
                throw new Error('Invalid component data: missing required fields');
            }

            const newComponentData: Omit<CustomComponent, 'id' | 'createdAt'> = {
                name: importedData.name, description: importedData.description,
                baseComponent: importedData.baseComponent, styles: importedData.styles || {},
                version: 1, versionHistory: [],
                category: importedData.category || 'other', tags: importedData.tags || [],
                variants: importedData.variants || [], isPublic: false,
                createdBy: user?.uid || '', usageCount: 0, projectsUsing: [],
                permissions: { canEdit: [], canView: [], isPublic: false },
                documentation: importedData.documentation
            };

            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...newComponentData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const createdComponent: CustomComponent = {
                id: docRef.id, ...newComponentData,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

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

        const targetVersion = component.versionHistory?.find(v => v.version === versionNumber);
        if (!targetVersion) throw new Error('Version not found');

        const docRef = doc(db, 'customComponents', componentId);
        await updateDoc(docRef, { styles: targetVersion.snapshot, lastModified: serverTimestamp(), modifiedBy: user?.uid || '' });

        setCustomComponents(prev => prev.map(c =>
            c.id === componentId
                ? { ...c, styles: targetVersion.snapshot, lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }, modifiedBy: user?.uid || '' }
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
                    const docRef = doc(db, 'customComponents', compId);
                    const updatedProjects = [...projectsUsing, projectId];
                    await updateDoc(docRef, { projectsUsing: updatedProjects, usageCount: updatedProjects.length });
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
            const docRef = doc(db, 'settings', 'designTokens');
            await setDoc(docRef, tokens);
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
            const settingsRef = doc(db, 'settings', 'components');
            await setDoc(settingsRef, { status: newStatus }, { merge: true });
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

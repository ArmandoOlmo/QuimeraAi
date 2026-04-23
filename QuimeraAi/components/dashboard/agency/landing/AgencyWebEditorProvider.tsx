import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useSafeProject, ProjectContext } from '../../../../contexts/project/ProjectContext';
import { EditorContext, useSafeEditor } from '../../../../contexts/EditorContext';
import { useTenant } from '../../../../contexts/tenant/TenantContext';
import { getAgencyLanding, saveAgencyLanding } from '../../../../services/agencyLandingService';
import { Project, PageData, ThemeData, PageSection, BrandIdentity, FileRecord } from '../../../../types';
import { initialData } from '../../../../data/initialData';
import { initialAgencyData } from './initialAgencyData';
import QuimeraLoader from '../../../ui/QuimeraLoader';
import { toast } from 'react-hot-toast';
import { AgencyLandingConfig } from '../../../../types/agencyLanding';
import { FilesContext, useFiles } from '../../../../contexts/files/FilesContext';
import { ref, uploadBytes, getDownloadURL, storage, db, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, deleteObject } from '../../../../firebase';

interface AgencyWebEditorProviderProps {
    children: ReactNode;
}

export const AgencyWebEditorProvider: React.FC<AgencyWebEditorProviderProps> = ({ children }) => {
    const parentProjectCtx = useSafeProject();
    const parentEditorCtx = useSafeEditor();
    const { user } = useAuth();
    const { currentTenant } = useTenant();
    const parentFilesCtx = useFiles();

    const [isLoading, setIsLoading] = useState(true);
    const [rawConfig, setRawConfig] = useState<AgencyLandingConfig | null>(null);

    // Agency Isolated Image Library State
    const [agencyFiles, setAgencyFiles] = useState<FileRecord[]>([]);
    const [isAgencyFilesLoading, setIsAgencyFilesLoading] = useState(true);

    // Overridden State for the Web Editor
    const [data, setData] = useState<PageData | null>(null);
    const [theme, setTheme] = useState<ThemeData>(initialAgencyData.theme);
    const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(initialData.brandIdentity);
    const [componentOrder, setComponentOrder] = useState<PageSection[]>(initialAgencyData.componentOrder as PageSection[]);
    const [sectionVisibility, setSectionVisibility] = useState<Record<PageSection, boolean>>(initialAgencyData.sectionVisibility as Record<PageSection, boolean>);

    const tenantId = currentTenant?.id;

    // Fetch and listen to Agency Files
    useEffect(() => {
        if (!tenantId) {
            setAgencyFiles([]);
            setIsAgencyFilesLoading(false);
            return;
        }

        setIsAgencyFilesLoading(true);
        const filesPath = `agencies/${tenantId}/files`;
        const q = query(collection(db, filesPath), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const filesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: 'agency-landing-mode', // Mock projectId so ImagePicker displays them
                ...docSnapshot.data()
            })) as FileRecord[];
            setAgencyFiles(filesData);
            setIsAgencyFilesLoading(false);
        }, (error) => {
            console.error("Error fetching agency files:", error);
            setIsAgencyFilesLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    useEffect(() => {
        if (!tenantId) return;

        const loadData = async () => {
            try {
                const config = await getAgencyLanding(tenantId);
                if (config) {
                    setRawConfig(config);
                    
                    // Map AgencyLandingConfig sections array to Editor format (PageData & ComponentOrder)
                    const mappedData: any = {};
                    const mappedOrder: PageSection[] = [];
                    const mappedVisibility: Record<any, boolean> = {};

                    config.sections.forEach(sec => {
                        const defaultData = initialAgencyData.data[sec.type as keyof PageData] as any;
                        mappedData[sec.type] = {
                            ...(defaultData || {}),
                            ...(sec.data || {})
                        };
                        mappedOrder.push(sec.type as PageSection);
                        mappedVisibility[sec.type] = sec.enabled;
                    });

                    // Ensure basic data structure exists
                    setData(mappedData as PageData);
                    setComponentOrder(mappedOrder.length > 0 ? mappedOrder : (initialAgencyData.componentOrder as PageSection[]));
                    setSectionVisibility(Object.keys(mappedVisibility).length > 0 ? mappedVisibility : (initialAgencyData.sectionVisibility as Record<PageSection, boolean>));

                    if (config.theme) {
                        setTheme(config.theme as ThemeData);
                    }
                    if (config.branding) {
                        // Very rough mapping of branding to generic project theme needs
                        setBrandIdentity(prev => ({ ...prev, logoText: config.branding.logoText || '' }));
                    }
                } else {
                    // Start fresh using Agency defaults
                    setData(initialAgencyData.data as PageData);
                    setTheme(initialAgencyData.theme);
                    setComponentOrder(initialAgencyData.componentOrder as PageSection[]);
                    setSectionVisibility(initialAgencyData.sectionVisibility as Record<PageSection, boolean>);
                }
            } catch (err) {
                console.error("Error loading agency landing for editor:", err);
                toast.error("Error de conexión. Se cargará la plantilla por defecto.");
                setData(initialAgencyData.data as PageData);
                setTheme(initialAgencyData.theme);
                setComponentOrder(initialAgencyData.componentOrder as PageSection[]);
                setSectionVisibility(initialAgencyData.sectionVisibility as Record<PageSection, boolean>);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [tenantId]);

    // Handle generic save
    const saveProjectMock = async () => {
        if (!tenantId || !data) return;
        try {
            // Re-map Web Editor data (PageData + componentOrder) back to AgencyLandingConfig sections array
            const existingSections = rawConfig?.sections || [];
            const newSections = componentOrder.map((sectionType, index) => {
                const existing = existingSections.find(s => s.type === sectionType);
                return {
                    id: existing?.id || `${sectionType}-${Date.now()}`,
                    type: sectionType,
                    order: index,
                    enabled: sectionVisibility[sectionType] !== false,
                    data: (data as any)[sectionType] || {}
                };
            });

            await saveAgencyLanding(tenantId, {
                // Keep everything else the same, update sections and theme
                ...rawConfig,
                sections: newSections,
                theme: theme as any
            });

            toast.success("Landing de Agencia guardado exitosamente");
        } catch (err) {
            console.error("Error saving agency landing from editor:", err);
            toast.error("Error al guardar la página");
            throw err;
        }
    };

    if (isLoading || !parentProjectCtx || !parentEditorCtx || !data) {
        return (
            <div className="flex h-full items-center justify-center">
                <QuimeraLoader size="lg" />
            </div>
        );
    }

    // Construct the customized Project Context
    const customProjectCtx: any = {
        ...parentProjectCtx,
        // Override the critical data binding to hit our local state
        data,
        setData: setData as any,
        theme,
        setTheme,
        brandIdentity,
        setBrandIdentity,
        componentOrder,
        setComponentOrder,
        sectionVisibility,
        setSectionVisibility,
        saveProject: saveProjectMock,
        // Dummy project active
        activeProjectId: 'agency-landing-mode',
        activeProject: {
            id: 'agency-landing-mode',
            name: 'Agency Landing',
            data: data,
            theme: theme,
            userId: user?.uid || '',
            status: 'draft',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        } as Project
    };

    // Construct the customized Editor Context
    const customEditorCtx: any = {
        ...parentEditorCtx,
        view: 'editor' as const, // CRITICAL: ChatbotWidget uses this to portal into #browser-preview-overlay
        data,
        setData: setData as any,
        theme,
        setTheme,
        brandIdentity,
        setBrandIdentity,
        componentOrder,
        setComponentOrder,
        sectionVisibility,
        setSectionVisibility,
        activeProjectId: 'agency-landing-mode',
        activeProject: customProjectCtx.activeProject,
        saveProject: saveProjectMock
    };

    // Construct the customized Files Context for intercepting image uploads
    const customFilesCtx: any = {
        ...parentFilesCtx,
        files: agencyFiles,
        isFilesLoading: isAgencyFilesLoading,
        uploadFile: async (file: File): Promise<string | undefined> => {
            if (!tenantId) return undefined;
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `agencies/${tenantId}/landing_images/${timestamp}_${safeFileName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const fileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                type: file.type,
                size: file.size,
                downloadURL,
                storagePath,
                projectId: 'agency-landing-mode',
                createdAt: new Date().toISOString(),
            };

            const filesPath = `agencies/${tenantId}/files`;
            await addDoc(collection(db, filesPath), fileRecord);
            return downloadURL;
        },
        deleteFile: async (fileId: string, storagePath: string) => {
            if (!tenantId) return;
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef).catch(() => console.warn("File not found in storage"));
            const filePath = `agencies/${tenantId}/files/${fileId}`;
            await deleteDoc(doc(db, filePath));
        },
        uploadImageAndGetURL: async (file: File, path: string): Promise<string> => {
            if (!tenantId) throw new Error("No tenant active");
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fullPath = `agencies/${tenantId}/landing_images/${timestamp}_${safeFileName}`;
            const storageRef = ref(storage, fullPath);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        }
    };

    return (
        <ProjectContext.Provider value={customProjectCtx}>
            <EditorContext.Provider value={customEditorCtx}>
                <FilesContext.Provider value={customFilesCtx}>
                    {children}
                </FilesContext.Provider>
            </EditorContext.Provider>
        </ProjectContext.Provider>
    );
};

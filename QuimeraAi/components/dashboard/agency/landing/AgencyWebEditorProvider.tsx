import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useSafeProject, ProjectContext } from '../../../../contexts/project/ProjectContext';
import { EditorContext, useSafeEditor } from '../../../../contexts/EditorContext';
import { useTenant } from '../../../../contexts/tenant/TenantContext';
import { getAgencyLanding, publishAgencyLanding, saveAgencyLanding } from '../../../../services/agencyLandingService';
import { Project, PageData, ThemeData, PageSection, BrandIdentity, FileRecord } from '../../../../types';
import { initialData } from '../../../../data/initialData';
import { initialAgencyData } from './initialAgencyData';
import QuimeraLoader from '../../../ui/QuimeraLoader';
import { toast } from 'react-hot-toast';
import { AgencyLandingConfig } from '../../../../types/agencyLanding';
import { FilesContext, useFiles } from '../../../../contexts/files/FilesContext';
import { supabase } from '../../../../supabase';
import { getInitialDataForLandingComponent } from '../../../../utils/landingSectionDefaults';
import { uploadPlatformAsset } from '../../../../utils/platformAssetUpload';

interface AgencyWebEditorProviderProps {
    children: ReactNode;
}

const AGENCY_STRUCTURE_ORDER: PageSection[] = ['colors', 'typography', 'header'];
const AGENCY_FOOTER_SECTION: PageSection = 'footer';
const AGENCY_LANDING_PROJECT_ID = 'agency-landing-mode';

const createDefaultAgencySection = (type: PageSection, order: number): AgencyLandingConfig['sections'][number] => ({
    id: type,
    type,
    order,
    enabled: initialAgencyData.sectionVisibility[type] !== false,
    data: (initialAgencyData.data as any)[type] || getInitialDataForLandingComponent(type),
});

const normalizeAgencyLandingSections = (sections?: AgencyLandingConfig['sections']): AgencyLandingConfig['sections'] => {
    const source = sections?.length
        ? [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : (initialAgencyData.componentOrder as PageSection[]).map((type, index) => createDefaultAgencySection(type, index));

    const byType = new Map<string, AgencyLandingConfig['sections'][number]>();
    source.forEach((section, index) => {
        if (!section?.type || byType.has(section.type)) return;
        byType.set(section.type, {
            ...section,
            id: AGENCY_STRUCTURE_ORDER.includes(section.type as PageSection) || section.type === AGENCY_FOOTER_SECTION
                ? section.type
                : section.id || `${section.type}-${index}`,
            order: section.order ?? index,
            enabled: section.enabled !== false,
            data: {
                ...((initialAgencyData.data as any)[section.type] || getInitialDataForLandingComponent(section.type)),
                ...(section.data || {}),
            },
        });
    });

    const normalized: AgencyLandingConfig['sections'] = [];
    AGENCY_STRUCTURE_ORDER.forEach((type, index) => {
        normalized.push(byType.get(type) || createDefaultAgencySection(type, index - AGENCY_STRUCTURE_ORDER.length));
        byType.delete(type);
    });

    const footer = byType.get(AGENCY_FOOTER_SECTION);
    byType.delete(AGENCY_FOOTER_SECTION);

    normalized.push(...Array.from(byType.values()));
    normalized.push(footer || createDefaultAgencySection(AGENCY_FOOTER_SECTION, normalized.length));

    return normalized.map((section, index) => ({ ...section, order: index }));
};

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

    const mapAgencyFileRow = useCallback((row: any): FileRecord => ({
        id: row.id,
        name: row.name,
        url: row.url,
        downloadURL: row.url,
        size: row.size || 0,
        type: row.type || 'image/png',
        storagePath: row.metadata?.storagePath || '',
        projectId: row.project_id || AGENCY_LANDING_PROJECT_ID,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        notes: row.metadata?.notes,
        summary: row.metadata?.summary,
    }), []);

    const refreshAgencyFiles = useCallback(async () => {
        if (!tenantId) {
            setAgencyFiles([]);
            setIsAgencyFilesLoading(false);
            return;
        }

        setIsAgencyFilesLoading(true);
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('project_id', AGENCY_LANDING_PROJECT_ID)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAgencyFiles((data || []).map(mapAgencyFileRow));
        } catch (error) {
            console.error("Error fetching agency files:", error);
        } finally {
            setIsAgencyFilesLoading(false);
        }
    }, [mapAgencyFileRow, tenantId]);

    // Fetch and listen to Agency Files
    useEffect(() => {
        if (!tenantId) {
            setAgencyFiles([]);
            setIsAgencyFilesLoading(false);
            return;
        }

        refreshAgencyFiles();

        const channel = supabase.channel(`agency-landing-files:${tenantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'files',
                filter: `project_id=eq.${AGENCY_LANDING_PROJECT_ID}`,
            }, () => {
                refreshAgencyFiles();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshAgencyFiles, tenantId]);

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

                    const normalizedSections = normalizeAgencyLandingSections(config.sections);

                    normalizedSections.forEach(sec => {
                        const defaultData = initialAgencyData.data[sec.type as keyof PageData] as any;
                        mappedData[sec.type] = {
                            ...(defaultData || getInitialDataForLandingComponent(sec.type)),
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
    const saveProjectMock = async (showToast = true) => {
        if (!tenantId || !data) return;
        try {
            // Re-map Web Editor data (PageData + componentOrder) back to AgencyLandingConfig sections array
                    const existingSections = normalizeAgencyLandingSections(rawConfig?.sections);
                    const newSections = componentOrder.map((sectionType, index) => {
                        const existing = existingSections.find(s => s.type === sectionType);
                        return {
                            id: existing?.id || (AGENCY_STRUCTURE_ORDER.includes(sectionType) || sectionType === AGENCY_FOOTER_SECTION ? sectionType : `${sectionType}-${Date.now()}`),
                            type: sectionType,
                            order: index,
                            enabled: sectionVisibility[sectionType] !== false,
                            data: (data as any)[sectionType] || {}
                        };
                    });

            const nextConfig = {
                // Keep everything else the same, update sections and theme
                ...(rawConfig || {}),
                tenantId,
                sections: newSections,
                theme: theme as any
            };

            await saveAgencyLanding(tenantId, {
                ...nextConfig,
            });
            setRawConfig(nextConfig as AgencyLandingConfig);

            if (showToast) {
                toast.success("Landing de Agencia guardado exitosamente");
            }
        } catch (err) {
            console.error("Error saving agency landing from editor:", err);
            toast.error("Error al guardar la página");
            throw err;
        }
    };

    const publishProjectMock = async (): Promise<boolean> => {
        if (!tenantId || !data) return false;
        try {
            await saveProjectMock(false);
            await publishAgencyLanding(tenantId);
            toast.success("Landing de Agencia publicado exitosamente");
            return true;
        } catch (err) {
            console.error("Error publishing agency landing from editor:", err);
            toast.error("Error al publicar la página");
            return false;
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
        publishProject: publishProjectMock,
        // Dummy project active
        activeProjectId: AGENCY_LANDING_PROJECT_ID,
        activeProject: {
            id: AGENCY_LANDING_PROJECT_ID,
            name: 'Agency Landing',
            data: data,
            theme: theme,
            userId: user?.id || '',
            status: 'draft',
            componentOrder,
            sectionVisibility,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        } as unknown as Project
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
        activeProjectId: AGENCY_LANDING_PROJECT_ID,
        activeProject: customProjectCtx.activeProject,
        saveProject: saveProjectMock,
        publishProject: publishProjectMock
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
            
            const { publicUrl: downloadURL } = await uploadPlatformAsset(storagePath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });

            const createdAt = new Date().toISOString();
            const fileRecord = {
                tenant_id: tenantId,
                project_id: AGENCY_LANDING_PROJECT_ID,
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                metadata: {
                    storagePath,
                    source: 'agency_landing',
                },
                created_at: createdAt,
            };

            const { data: inserted, error } = await supabase
                .from('files')
                .insert([fileRecord])
                .select('*')
                .single();

            if (error) {
                await supabase.storage.from('platform-assets').remove([storagePath]).catch(() => undefined);
                throw error;
            }

            if (inserted) {
                const nextFile = mapAgencyFileRow(inserted);
                setAgencyFiles(prev => [nextFile, ...prev.filter(f => f.id !== nextFile.id)]);
            }

            return downloadURL;
        },
        deleteFile: async (fileId: string, storagePath: string) => {
            if (!tenantId) return;
            
            await supabase.storage
                .from('platform-assets')
                .remove([storagePath])
                .catch(() => console.warn("File not found in storage"));
                
            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId)
                .eq('tenant_id', tenantId)
                .eq('project_id', AGENCY_LANDING_PROJECT_ID);

            if (error) throw error;
            setAgencyFiles(prev => prev.filter(f => f.id !== fileId));
        },
        uploadImageAndGetURL: async (file: File, path: string): Promise<string> => {
            if (!tenantId) throw new Error("No tenant active");
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fullPath = `agencies/${tenantId}/landing_images/${timestamp}_${safeFileName}`;
            
            const { publicUrl: url } = await uploadPlatformAsset(fullPath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });

            const { data: inserted, error } = await supabase
                .from('files')
                .insert([{
                    tenant_id: tenantId,
                    project_id: AGENCY_LANDING_PROJECT_ID,
                    name: file.name,
                    url,
                    size: file.size,
                    type: file.type,
                    metadata: {
                        storagePath: fullPath,
                        source: 'agency_landing_direct_upload',
                        requestedPath: path,
                    },
                    created_at: new Date().toISOString(),
                }])
                .select('*')
                .single();

            if (error) {
                await supabase.storage.from('platform-assets').remove([fullPath]).catch(() => undefined);
                throw error;
            }

            if (inserted) {
                const nextFile = mapAgencyFileRow(inserted);
                setAgencyFiles(prev => [nextFile, ...prev.filter(f => f.id !== nextFile.id)]);
            }

            return url;
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

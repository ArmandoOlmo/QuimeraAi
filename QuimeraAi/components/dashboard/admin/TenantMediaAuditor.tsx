import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabase';
import { FileRecord } from '../../../types';
import { Loader2, Search, Filter, FolderOpen, User, Calendar, Image as ImageIcon, MapPin } from 'lucide-react';
import { formatBytes, formatFileDate } from '../../../utils/fileHelpers';
import Modal from '../../ui/Modal';

export default function TenantMediaAuditor() {
    const { t } = useTranslation();
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

    useEffect(() => {
        const fetchTenantFiles = async () => {
            setIsLoading(true);
            try {
                // We use the supabase client directly to bypass RLS or assuming the user is superadmin
                // which has privileges over 'files' table.
                const { data, error } = await supabase
                    .from('files')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500); // Limit to prevent massive loads

                if (error) throw error;
                
                // Map database response to FileRecord type
                const formattedFiles: FileRecord[] = (data || []).map(row => ({
                    id: row.id,
                    name: row.name,
                    size: row.size,
                    type: row.type,
                    url: row.url,
                    folderId: row.folder_id,
                    projectId: row.project_id,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));
                
                setFiles(formattedFiles);
            } catch (error) {
                console.error('Error fetching tenant files:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenantFiles();
    }, []);

    const filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.tenantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.projectId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-q-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-q-bg overflow-hidden relative">
            <header className="h-14 px-4 sm:px-6 border-b border-q-border flex items-center justify-between bg-q-bg z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <User className="text-q-accent w-5 h-5" />
                    <h2 className="font-semibold text-q-text">
                        {t('superadmin.tenantMedia.title', 'Archivos de Usuarios')}
                    </h2>
                    <span className="ml-2 text-xs text-q-text-secondary bg-q-surface-overlay px-2 py-1 rounded-md">
                        {filteredFiles.length} {t('common.files', 'archivos')}
                    </span>
                </div>
                
                <div className="flex-1 max-w-md mx-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-q-text-muted" />
                        <input
                            type="text"
                            placeholder={t('superadmin.tenantMedia.searchPlaceholder', 'Buscar por nombre o ID de inquilino...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-q-surface border border-q-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-q-accent transition-colors"
                        />
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-q-text-secondary">
                        <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
                        <p>{t('superadmin.tenantMedia.noFiles', 'No se encontraron archivos')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                        {filteredFiles.map(file => (
                            <div 
                                key={file.id} 
                                onClick={() => setSelectedFile(file)}
                                className="group relative bg-q-surface rounded-xl border border-q-border overflow-hidden hover:border-q-accent cursor-pointer transition-all aspect-square"
                            >
                                {file.type.startsWith('image/') ? (
                                    <img 
                                        src={file.url} 
                                        alt={file.name} 
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-q-surface-overlay text-q-text-muted">
                                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs truncate max-w-[80%]">{file.type || 'Unknown'}</span>
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-xs font-medium truncate">{file.name}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-white/70 text-[10px]">{formatBytes(file.size)}</span>
                                        <span className="text-white/70 text-[10px] truncate max-w-[60px]" title={file.tenantId}>{file.tenantId?.substring(0,6) || 'No tenant'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!selectedFile}
                onClose={() => setSelectedFile(null)}
                title={t('superadmin.tenantMedia.fileDetails', 'Detalles del Archivo')}
                size="lg"
            >
                {selectedFile && (
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/2 aspect-square bg-q-surface rounded-lg overflow-hidden flex items-center justify-center border border-q-border">
                            {selectedFile.type.startsWith('image/') ? (
                                <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <ImageIcon className="w-16 h-16 text-q-text-muted" />
                            )}
                        </div>
                        <div className="w-full md:w-1/2 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-q-text-secondary">{t('common.name', 'Nombre')}</h3>
                                <p className="text-q-text break-all">{selectedFile.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-q-text-secondary">{t('common.size', 'Tamaño')}</h3>
                                    <p className="text-q-text">{formatBytes(selectedFile.size)}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-q-text-secondary">{t('common.type', 'Tipo')}</h3>
                                    <p className="text-q-text">{selectedFile.type}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-q-text-secondary">{t('superadmin.tenantMedia.tenant', 'Inquilino')}</h3>
                                    <p className="text-q-text truncate" title={selectedFile.tenantId}>{selectedFile.tenantId || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-q-text-secondary">{t('superadmin.tenantMedia.project', 'Proyecto')}</h3>
                                    <p className="text-q-text truncate" title={selectedFile.projectId}>{selectedFile.projectId || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-q-text-secondary">{t('common.date', 'Fecha')}</h3>
                                    <p className="text-q-text">{formatFileDate(selectedFile.createdAt)}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-q-border">
                                <a 
                                    href={selectedFile.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-center py-2 px-4 bg-q-surface hover:bg-q-surface-overlay border border-q-border rounded-lg text-q-text transition-colors"
                                >
                                    {t('common.openInNewTab', 'Abrir en nueva pestaña')}
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

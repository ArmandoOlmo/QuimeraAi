
import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Image, Upload, Trash2, Download, Zap } from 'lucide-react';
import { FileRecord } from '../../../types';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';

interface ImageLibraryManagementProps {
    onBack: () => void;
}

const ImageLibraryManagement: React.FC<ImageLibraryManagementProps> = ({ onBack }) => {
    const { globalFiles, isGlobalFilesLoading, fetchGlobalFiles, uploadGlobalFile, deleteGlobalFile } = useEditor();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    useEffect(() => {
        fetchGlobalFiles();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadGlobalFile(file);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <>
            <ImageGeneratorModal 
                isOpen={isGeneratorOpen} 
                onClose={() => setIsGeneratorOpen(false)} 
                destination="global"
            />
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={false} onClose={() => {}} /> {/* Simplification: Always open for admin for now, or handle state */}
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button onClick={onBack} className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2" title="Back to Admin">
                                <ArrowLeft />
                            </button>
                            <div className="flex items-center space-x-2">
                                <Image className="text-editor-accent" />
                                <h1 className="text-xl font-bold text-editor-text-primary">Global Image Library</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={onBack} className="hidden sm:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors">
                                <ArrowLeft size={16} className="mr-1.5" />
                                Back to Admin
                            </button>
                            <button 
                                onClick={() => setIsGeneratorOpen(true)}
                                className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-editor-accent text-white hover:opacity-90 transition-all shadow-lg shadow-editor-accent/20"
                            >
                                <Zap size={16} className="mr-1.5" />
                                Generate Image
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-accent text-editor-bg hover:bg-editor-accent-hover transition-colors"
                            >
                                <Upload size={16} className="mr-1.5" />
                                Upload Image
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                        </div>
                    </header>

                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                        <p className="text-editor-text-secondary mb-6">Manage the global stock images available to all users in their Asset Library.</p>

                        {isGlobalFilesLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : globalFiles.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-editor-border rounded-xl">
                                <Image size={48} className="mx-auto text-editor-text-secondary opacity-50 mb-4" />
                                <p className="text-editor-text-secondary">No global images uploaded yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {globalFiles.map((file) => (
                                    <div key={file.id} className="group relative bg-editor-panel-bg rounded-lg border border-editor-border overflow-hidden hover:border-editor-accent transition-colors">
                                        <div className="aspect-square bg-editor-bg overflow-hidden">
                                            <img src={file.downloadURL} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-medium text-editor-text-primary truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-editor-text-secondary mt-1">{formatBytes(file.size)}</p>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a 
                                                href={file.downloadURL} 
                                                download={file.name}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 bg-black/60 text-white rounded-md hover:bg-editor-accent transition-colors"
                                                title="Download/View"
                                            >
                                                <Download size={14} />
                                            </a>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('Delete this global asset?')) {
                                                        deleteGlobalFile(file.id, file.storagePath);
                                                    }
                                                }}
                                                className="p-1.5 bg-black/60 text-white rounded-md hover:bg-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default ImageLibraryManagement;


import React, { useRef, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { FileRecord } from '../../types';
import { FileText, Upload, Trash2, Download, Sparkles, ChevronDown, Zap, X, Calendar, HardDrive } from 'lucide-react';
import ImageGeneratorModal from '../ui/ImageGeneratorModal';
import Modal from '../ui/Modal';

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileItem: React.FC<{ file: FileRecord; variant: 'widget' | 'full'; onPreview: (file: FileRecord) => void }> = ({ file, variant, onPreview }) => {
    const { deleteFile, updateFileNotes, generateFileSummary } = useEditor();
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState(file.notes);
    const notesTimeoutRef = useRef<number | null>(null);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        if (notesTimeoutRef.current) {
            clearTimeout(notesTimeoutRef.current);
        }
        notesTimeoutRef.current = window.setTimeout(() => {
            updateFileNotes(file.id, e.target.value);
        }, 1000); 
    };
    
    const isSummarizable = file.type.startsWith('text/');

    const renderActions = () => (
        <div className="flex items-center justify-between pt-1">
            <button 
                onClick={(e) => { e.stopPropagation(); generateFileSummary(file.id, file.downloadURL); }}
                disabled={!isSummarizable}
                className="flex items-center text-[10px] font-bold py-1.5 px-3 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Sparkles size={12} className="mr-1.5" /> Summarize
            </button>
            <div className="flex items-center space-x-1">
                <a 
                    href={file.downloadURL} 
                    download={file.name} 
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors" 
                    title="Download"
                >
                    <Download size={14} />
                </a>
                <button 
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id, file.storagePath); }} 
                    className="p-1.5 text-muted-foreground rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors" 
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );

    // Unified Card Layout for both Widget and Full view
    return (
        <div className="bg-card hover:bg-card/80 border border-border hover:border-primary/30 rounded-xl transition-all duration-200 group flex flex-col relative overflow-hidden h-full shadow-sm">
            <div 
                className="aspect-square w-full bg-secondary/30 relative cursor-pointer border-b border-border/50 overflow-hidden" 
                onClick={() => setIsOpen(!isOpen)}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onPreview(file);
                }}
                title="Double click to preview"
            >
                    {file.type.startsWith('image/') ? (
                        <img
                            src={file.downloadURL}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary bg-secondary/50">
                            <FileText size={48} />
                        </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className={`p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full transition-all transform ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={16}/>
                    </button>
                    </div>
                </div>

                <div className="p-3 md:p-4 flex flex-col flex-grow">
                <div className="mb-2">
                    <p className="font-semibold text-xs md:text-sm text-foreground truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        {formatBytes(file.size)} &middot; {file.createdAt && file.createdAt.seconds ? new Date(file.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                    </p>
                </div>
                
                {isOpen && (
                    <div className="pt-3 border-t border-border/50 animate-fade-in-up mt-auto">
                            <div className="space-y-3">
                            <textarea 
                                value={notes}
                                onChange={handleNotesChange}
                                rows={2}
                                placeholder="Add notes..."
                                className="w-full bg-secondary/50 text-xs text-foreground p-2 rounded-lg border border-border focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                            />
                            {file.aiSummary && (
                                    <div className="bg-secondary/30 p-2 rounded-lg border border-border/50">
                                    <div className="flex items-center mb-1">
                                        <Sparkles size={12} className="text-primary mr-1" />
                                        <span className="text-[10px] font-bold text-primary uppercase">AI Summary</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">{file.aiSummary}</p>
                                    </div>
                            )}
                            {renderActions()}
                            </div>
                    </div>
                )}
                </div>
        </div>
    );
};

interface FileHistoryProps {
    variant?: 'widget' | 'full';
}

const FileHistory: React.FC<FileHistoryProps> = ({ variant = 'widget' }) => {
    const { files, isFilesLoading, uploadFile } = useEditor();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const containerClasses = variant === 'widget' 
        ? "bg-card/50 rounded-2xl border border-border p-5 backdrop-blur-sm"
        : "h-full flex flex-col";

    // Use grid classes for both variants now
    const gridClasses = variant === 'widget'
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6";

    const scrollContainerClasses = variant === 'widget'
        ? "max-h-[500px] overflow-y-auto custom-scrollbar pr-1"
        : "flex-1 overflow-y-auto custom-scrollbar pr-1";

    return (
        <section className={containerClasses}>
            <ImageGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} destination="user" />
            
            {/* Asset Preview Modal */}
            <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
                {previewFile && (
                    <div className="flex flex-col h-full max-h-[85vh] bg-editor-panel-bg">
                        <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg z-10">
                             <h3 className="font-bold text-lg text-editor-text-primary truncate max-w-[80%]">{previewFile.name}</h3>
                             <button 
                                onClick={() => setPreviewFile(null)} 
                                className="p-2 rounded-full hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <X size={20}/>
                             </button>
                        </div>
                        <div className="flex-1 overflow-auto p-0 bg-black/90 flex items-center justify-center relative">
                             {/* Blurred Background for Images */}
                             {previewFile.type.startsWith('image/') && (
                                <div 
                                    className="absolute inset-0 opacity-30 blur-3xl scale-110"
                                    style={{ backgroundImage: `url(${previewFile.downloadURL})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                            )}

                             {previewFile.type.startsWith('image/') ? (
                                <img 
                                    src={previewFile.downloadURL} 
                                    alt={previewFile.name} 
                                    className="max-w-full max-h-full object-contain shadow-2xl relative z-10" 
                                />
                            ) : (
                                <div className="flex flex-col items-center text-gray-400 relative z-10">
                                    <FileText size={80} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Preview not available for this file type</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-editor-border bg-editor-panel-bg flex justify-between items-center z-10">
                            <div className="flex space-x-6 text-xs text-editor-text-secondary">
                                <span className="flex items-center"><HardDrive size={14} className="mr-2 text-editor-accent"/> {formatBytes(previewFile.size)}</span>
                                <span className="flex items-center">
                                    <Calendar size={14} className="mr-2 text-editor-accent"/> 
                                    {previewFile.createdAt && previewFile.createdAt.seconds ? new Date(previewFile.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                </span>
                            </div>
                            <a 
                                href={previewFile.downloadURL} 
                                download={previewFile.name}
                                className="flex items-center bg-editor-accent text-editor-bg px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-editor-accent-hover transition-transform hover:scale-105 text-sm"
                            >
                                <Download size={16} className="mr-2" /> Download Asset
                            </a>
                        </div>
                    </div>
                )}
            </Modal>

            <div className={`flex justify-between items-center ${variant === 'widget' ? 'mb-4' : 'mb-6'}`}>
                <h2 className={`font-bold text-muted-foreground uppercase tracking-wider ${variant === 'widget' ? 'text-sm' : 'text-base hidden'}`}>Asset Library</h2>
                <div className="flex space-x-2 ml-auto">
                     <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="flex items-center justify-center bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                        title="Generate Image"
                    >
                        <Zap size={14} className="text-yellow-400 mr-1.5" />
                        AI Generate
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                    >
                        <Upload size={14} className="mr-1.5" />
                        Upload
                    </button>
                </div>
            </div>
            
            <div className={scrollContainerClasses}>
                {isFilesLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs">Syncing...</span>
                    </div>
                ) : files.length > 0 ? (
                    <div className={gridClasses}>
                        {files.map(file => (
                            <div key={file.id} className="h-full">
                                <FileItem file={file} variant={variant} onPreview={setPreviewFile} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                        <div className="mx-auto w-10 h-10 bg-secondary rounded-full flex items-center justify-center mb-2">
                            <Upload size={18} className="text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Drag & drop or upload assets here.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default FileHistory;

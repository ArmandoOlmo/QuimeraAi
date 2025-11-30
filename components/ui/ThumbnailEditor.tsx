import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { Project } from '../../types';

interface ThumbnailEditorProps {
    project: Project;
    onClose: () => void;
    onUpdate?: () => void;
}

const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({ project, onClose, onUpdate }) => {
    const { updateProjectThumbnail } = useEditor();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>(project.thumbnailUrl);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extract actual colors from project (check theme.globalColors first, then section colors)
    const getProjectColors = (): { name: string; color: string }[] => {
        // Try globalColors first
        const gc = project.theme?.globalColors;
        if (gc?.primary || gc?.secondary || gc?.accent) {
            return [
                { name: 'Primary', color: gc.primary },
                { name: 'Secondary', color: gc.secondary },
                { name: 'Accent', color: gc.accent },
                { name: 'Background', color: gc.background },
                { name: 'Text', color: gc.text },
            ].filter(c => c.color) as { name: string; color: string }[];
        }
        
        // Fallback to hero colors
        const hc = project.data?.hero?.colors;
        if (hc) {
            return [
                { name: 'Primary', color: hc.primary },
                { name: 'Secondary', color: hc.secondary },
                { name: 'Background', color: hc.background },
                { name: 'Text', color: hc.text },
                { name: 'Heading', color: hc.heading },
            ].filter(c => c.color) as { name: string; color: string }[];
        }
        
        // Fallback to header colors
        const headerC = project.data?.header?.colors;
        if (headerC) {
            return [
                { name: 'Background', color: headerC.background },
                { name: 'Text', color: headerC.text },
                { name: 'Accent', color: headerC.accent },
            ].filter(c => c.color) as { name: string; color: string }[];
        }
        
        return [];
    };
    
    const themeColors = getProjectColors();

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        
        try {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to storage
            await updateProjectThumbnail(project.id, file);
            
            onUpdate?.();
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            alert('Failed to upload thumbnail');
            setPreviewUrl(project.thumbnailUrl);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-background border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Change Thumbnail</h2>
                            <p className="text-sm text-muted-foreground">{project.name}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Current Thumbnail Preview with Color Swatches */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
                        <img 
                            src={previewUrl} 
                            alt="Thumbnail preview" 
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Color Swatches - Bottom Right Corner */}
                        {themeColors.length > 0 && (
                            <div className="absolute bottom-3 right-3 flex gap-1">
                                {themeColors.map((item, index) => (
                                    <div
                                        key={index}
                                        className="w-4 h-4 rounded-[4px] shadow-lg border border-white/30 transition-transform hover:scale-125"
                                        style={{ backgroundColor: item.color }}
                                        title={`${item.name}: ${item.color}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Upload Overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Color Legend */}
                    {themeColors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {themeColors.map((item, index) => (
                                <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <div 
                                        className="w-3 h-3 rounded-[3px] border border-border"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload Area */}
                    <div
                        className={`
                            relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
                            ${dragActive 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                            }
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleInputChange}
                            className="hidden"
                        />
                        
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Drag & drop or click to upload
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, WebP up to 5MB
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary/30">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThumbnailEditor;


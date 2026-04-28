import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { validateFileSize, validateFileType, isImageFile } from '../../utils/fileHelpers';

interface DragDropZoneProps {
    onFileSelect: (file: File) => void | Promise<void>;
    accept?: string; // e.g., "image/*"
    maxSizeMB?: number;
    allowedTypes?: string[];
    className?: string;
    disabled?: boolean;
    multiple?: boolean;
    variant?: 'compact' | 'full';
    children?: React.ReactNode;
}

const DragDropZone: React.FC<DragDropZoneProps> = ({
    onFileSelect,
    accept = '*',
    maxSizeMB = 10,
    allowedTypes = [],
    className = '',
    disabled = false,
    multiple = false,
    variant = 'full',
    children
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        // Validate size
        const sizeValidation = validateFileSize(file, maxSizeMB);
        if (!sizeValidation.valid) return sizeValidation;

        // Validate type if specified
        if (allowedTypes.length > 0) {
            const typeValidation = validateFileType(file, allowedTypes);
            if (!typeValidation.valid) return typeValidation;
        }

        return { valid: true };
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setError(null);
        setIsUploading(true);

        try {
            const fileArray = Array.from(files);
            
            for (const file of fileArray) {
                const validation = validateFile(file);
                
                if (!validation.valid) {
                    setError(validation.error || 'Invalid file');
                    continue;
                }
                
                await onFileSelect(file);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (!disabled) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };

    const handleClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    if (variant === 'compact' && children) {
        return (
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-all ${isDragging ? 'ring-2 ring-q-accent ring-offset-2' : ''} ${className}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={disabled}
                    multiple={multiple}
                />
                <div onClick={handleClick}>
                    {children}
                </div>
                {error && (
                    <div className="absolute top-full left-0 right-0 mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-md z-10">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
                relative border-2 border-dashed rounded-xl transition-all cursor-pointer
                ${isDragging 
                    ? 'border-q-accent bg-q-accent/10 scale-[1.02]' 
                    : 'border-q-border hover:border-q-accent/50 bg-q-surface/30'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-q-surface/50'}
                ${className}
            `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
                multiple={multiple}
            />
            
            <div className="p-8 text-center">
                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-q-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium text-q-text">Uploading...</p>
                    </div>
                ) : (
                    <>
                        <div className="mx-auto w-16 h-16 bg-q-bg rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            {accept.includes('image') ? (
                                <ImageIcon size={32} className="text-q-accent" />
                            ) : (
                                <Upload size={32} className="text-q-accent" />
                            )}
                        </div>
                        
                        <h3 className="text-base font-bold text-q-text mb-2">
                            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                        </h3>
                        
                        <p className="text-sm text-q-text-secondary mb-4">
                            or click to browse
                        </p>
                        
                        <div className="text-xs text-q-text-secondary space-y-1">
                            {accept !== '*' && (
                                <p>Accepted: {accept}</p>
                            )}
                            <p>Max size: {maxSizeMB}MB</p>
                        </div>
                    </>
                )}
            </div>
            
            {error && (
                <div className="absolute bottom-2 left-2 right-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                    {error}
                </div>
            )}
        </div>
    );
};

export default DragDropZone;


import React, { useState } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import { KnowledgeDocument } from '../../../types';

interface KnowledgeDocumentUploaderProps {
    documents: KnowledgeDocument[];
    onDocumentsChange: (documents: KnowledgeDocument[]) => void;
}

const SUPPORTED_TYPES = [
    { ext: '.pdf', mime: 'application/pdf', label: 'PDF' },
    { ext: '.txt', mime: 'text/plain', label: 'Text' },
    { ext: '.md', mime: 'text/markdown', label: 'Markdown' },
    { ext: '.csv', mime: 'text/csv', label: 'CSV' },
    { ext: '.html', mime: 'text/html', label: 'HTML' },
];

const KnowledgeDocumentUploader: React.FC<KnowledgeDocumentUploaderProps> = ({ documents, onDocumentsChange }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileType = file.type;

        // For text-based files, read directly
        if (fileType.startsWith('text/') || fileType === 'application/pdf') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    
                    // For PDFs, we'll use Gemini API to extract text
                    if (fileType === 'application/pdf') {
                        extractPDFWithGemini(file).then(resolve).catch(reject);
                    } else {
                        resolve(content);
                    }
                };
                reader.onerror = reject;
                
                if (fileType === 'application/pdf') {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsText(file);
                }
            });
        }

        throw new Error('Unsupported file type');
    };

    const extractPDFWithGemini = async (file: File): Promise<string> => {
        try {
            const ai = await getGoogleGenAI();
            
            // Convert file to base64
            const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    // Remove data URL prefix
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(file);
            });

            // Use Gemini to extract text from PDF
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: file.type,
                                data: base64Data
                            }
                        },
                        {
                            text: 'Extract all text content from this document. Return only the extracted text, no additional commentary.'
                        }
                    ]
                }]
            });

            return response?.text || '';
        } catch (error) {
            console.error('Error extracting PDF with Gemini:', error);
            throw error;
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadStatus('idle');

        try {
            const file = files[0];

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size exceeds 10MB limit');
            }

            // Validate file type
            const isSupported = SUPPORTED_TYPES.some(type => 
                file.type === type.mime || file.name.endsWith(type.ext)
            );

            if (!isSupported) {
                throw new Error('Unsupported file type');
            }

            // Extract text content
            const content = await extractTextFromFile(file);

            if (!content || content.trim().length === 0) {
                throw new Error('No text content could be extracted from the file');
            }

            // Create new document record
            const newDoc: KnowledgeDocument = {
                id: `doc_${Date.now()}`,
                name: file.name,
                content: content,
                extractedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                fileType: file.type,
                size: file.size
            };

            // Add to documents list
            onDocumentsChange([...documents, newDoc]);

            setUploadStatus('success');
            setStatusMessage(`Successfully uploaded ${file.name}`);
            
            // Reset file input
            event.target.value = '';

            // Clear success message after 3 seconds
            setTimeout(() => {
                setUploadStatus('idle');
                setStatusMessage('');
            }, 3000);

        } catch (error: any) {
            console.error('Error uploading document:', error);
            setUploadStatus('error');
            setStatusMessage(error.message || 'Failed to upload document');
            
            // Clear error message after 5 seconds
            setTimeout(() => {
                setUploadStatus('idle');
                setStatusMessage('');
            }, 5000);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = (docId: string) => {
        onDocumentsChange(documents.filter(doc => doc.id !== docId));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (timestamp: { seconds: number; nanoseconds: number }): string => {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 transition-colors bg-card">
                <label className="cursor-pointer block">
                    <input
                        type="file"
                        className="hidden"
                        accept={SUPPORTED_TYPES.map(t => t.ext).join(',')}
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <div className="text-center">
                        {isUploading ? (
                            <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
                        ) : (
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                        )}
                        <p className="text-sm font-medium text-foreground mb-1">
                            {isUploading ? 'Processing document...' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {SUPPORTED_TYPES.map(t => t.label).join(', ')} (Max 10MB)
                        </p>
                    </div>
                </label>
            </div>

            {/* Status Message */}
            {uploadStatus !== 'idle' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    uploadStatus === 'success' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    {uploadStatus === 'success' ? (
                        <CheckCircle size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}
                    <span className="text-sm font-medium">{statusMessage}</span>
                </div>
            )}

            {/* Documents List */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        Uploaded Documents ({documents.length})
                    </h4>
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                            >
                                <FileText size={20} className="text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {doc.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(doc.size)} • {formatDate(doc.extractedAt)} • {doc.content.length} characters
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                    title="Remove document"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>💡 Tip:</strong> Upload documents containing your business information, policies, product catalogs, 
                    or FAQs. The AI will use this content to provide more accurate and contextual responses to your customers.
                </p>
            </div>
        </div>
    );
};

export default KnowledgeDocumentUploader;


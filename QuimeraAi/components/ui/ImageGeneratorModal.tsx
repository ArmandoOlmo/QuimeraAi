import React from 'react';
import MediaGeneratorModal from '../media-generator/MediaGeneratorModal';

interface ImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: 'user' | 'global' | 'admin';
    adminCategory?: string;
    onImageGenerated?: (imageUrl: string) => void;
    onUseImage?: (imageUrl: string) => void;
    onVideoGenerated?: (videoUrl: string) => void;
    onUseVideo?: (videoUrl: string) => void;
    projectId?: string;
    generationContext?: 'background' | 'general';
    defaultMode?: 'image' | 'video';
}

/** @deprecated Use MediaGeneratorModal — kept for backward compatibility */
const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = (props) => {
    return <MediaGeneratorModal {...props} defaultMode={props.defaultMode ?? 'image'} />;
};

export default ImageGeneratorModal;

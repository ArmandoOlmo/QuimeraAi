import React from 'react';
import Modal from './Modal';
import ImageGeneratorPanel from './ImageGeneratorPanel';

interface ImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: 'user' | 'global';
    onImageGenerated?: (imageUrl: string) => void;
    onUseImage?: (imageUrl: string) => void;
}

const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ isOpen, onClose, destination, onImageGenerated, onUseImage }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-5xl"
            fullScreenMobile
        >
            <ImageGeneratorPanel
                destination={destination}
                onClose={onClose}
                className="h-[85vh] sm:h-[85vh]"
                onImageGenerated={onImageGenerated}
                onUseImage={onUseImage}
            />
        </Modal>
    );
};

export default ImageGeneratorModal;


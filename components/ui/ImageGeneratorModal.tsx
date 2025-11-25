import React from 'react';
import Modal from './Modal';
import ImageGeneratorPanel from './ImageGeneratorPanel';

interface ImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: 'user' | 'global';
}

const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ isOpen, onClose, destination }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
             <div className="bg-transparent w-full max-w-4xl h-[85vh]">
                 <div className="relative h-full">
                    <ImageGeneratorPanel destination={destination} />
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary z-10"
                    >
                        {/* Close button styling might need adjustment depending on Panel header */}
                    </button>
                 </div>
             </div>
        </Modal>
    );
};

export default ImageGeneratorModal;
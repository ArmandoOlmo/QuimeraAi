import React from 'react';
import Modal from '../ui/Modal';
import MediaGeneratorPanel, { MediaGeneratorPanelProps } from './MediaGeneratorPanel';

type MediaGeneratorModalProps = Omit<MediaGeneratorPanelProps, 'className' | 'onCollapse'> & {
    isOpen: boolean;
    onClose: () => void;
};

const MediaGeneratorModal: React.FC<MediaGeneratorModalProps> = ({
    isOpen,
    onClose,
    ...panelProps
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" fullScreenMobile>
            <MediaGeneratorPanel
                {...panelProps}
                onClose={onClose}
                className="h-[85vh] sm:h-[85vh]"
            />
        </Modal>
    );
};

export default MediaGeneratorModal;

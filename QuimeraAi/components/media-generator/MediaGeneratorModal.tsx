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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-6xl"
            className="p-2 sm:h-[90vh] sm:p-3"
            fullScreenMobile
        >
            <MediaGeneratorPanel
                {...panelProps}
                onClose={onClose}
                className="h-full min-h-0 overflow-hidden rounded-xl border border-q-border/70"
            />
        </Modal>
    );
};

export default MediaGeneratorModal;

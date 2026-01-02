/**
 * ControlsRenderer
 * Utility to render the appropriate controls for a selected block
 */

import React from 'react';
import { EmailBlock } from '../../../../../types/email';
import HeroBlockControls from './HeroBlockControls';
import TextBlockControls from './TextBlockControls';
import ImageBlockControls from './ImageBlockControls';
import ButtonBlockControls from './ButtonBlockControls';
import DividerBlockControls from './DividerBlockControls';
import SpacerBlockControls from './SpacerBlockControls';
import SocialBlockControls from './SocialBlockControls';
import FooterBlockControls from './FooterBlockControls';
import ProductsBlockControls from './ProductsBlockControls';
import ColumnsBlockControls from './ColumnsBlockControls';

type TabType = 'content' | 'style';

export const renderBlockControls = (block: EmailBlock, activeTab: TabType): React.ReactNode => {
    const props = { block, activeTab };
    
    switch (block.type) {
        case 'hero':
            return <HeroBlockControls {...props} />;
        case 'text':
            return <TextBlockControls {...props} />;
        case 'image':
            return <ImageBlockControls {...props} />;
        case 'button':
            return <ButtonBlockControls {...props} />;
        case 'divider':
            return <DividerBlockControls {...props} />;
        case 'spacer':
            return <SpacerBlockControls {...props} />;
        case 'social':
            return <SocialBlockControls {...props} />;
        case 'footer':
            return <FooterBlockControls {...props} />;
        case 'products':
            return <ProductsBlockControls {...props} />;
        case 'columns':
            return <ColumnsBlockControls {...props} />;
        default:
            return (
                <div className="text-center py-8 text-editor-text-secondary">
                    <p className="text-sm">No controls available for this block type</p>
                </div>
            );
    }
};

export default renderBlockControls;







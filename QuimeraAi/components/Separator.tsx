import React from 'react';
import SectionBackground from './ui/SectionBackground';
import { SeparatorData } from '../types';
import { hexToRgba } from '../utils/colorUtils';

import { useSafeDesignTokens } from '../hooks/useDesignTokens';

interface SeparatorProps {
    data: SeparatorData;
}

const Separator: React.FC<SeparatorProps> = ({ data }) => {
    const { colors } = useSafeDesignTokens();
    const bgColor = data.colors?.background || data.color || colors.background || '#ffffff';

    return (
        <SectionBackground
            backgroundImageUrl={data.backgroundImageUrl}
            backgroundOverlayEnabled={data.backgroundOverlayEnabled}
            backgroundOverlayOpacity={data.backgroundOverlayOpacity}
            backgroundOverlayColor={data.backgroundOverlayColor}
            backgroundColor={bgColor}
        >
            <section
                className={data.glassEffect ? "backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]" : ""}
                style={{
                    width: '100%',
                    height: `${data.height}px`,
                    backgroundColor: data.glassEffect ? hexToRgba(bgColor, 0.4) : bgColor,
                }}
            />
        </SectionBackground>
    );
};

export default Separator;

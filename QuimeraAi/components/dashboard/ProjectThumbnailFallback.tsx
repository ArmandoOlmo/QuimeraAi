import React from 'react';
import { QUIMERA_LOGO_URL } from '../../constants/brandAssets';

interface ProjectThumbnailFallbackProps {
  className?: string;
  logoClassName?: string;
}

const ProjectThumbnailFallback: React.FC<ProjectThumbnailFallbackProps> = ({
  className = '',
  logoClassName = 'h-14 w-14',
}) => {
  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-q-surface-overlay flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <img
        src={QUIMERA_LOGO_URL}
        alt=""
        className={`relative ${logoClassName} object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)]`}
        draggable={false}
      />
    </div>
  );
};

export default ProjectThumbnailFallback;

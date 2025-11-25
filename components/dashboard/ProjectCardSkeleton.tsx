
import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden h-[400px] animate-pulse">
      {/* Full Background Skeleton */}
      <div className="absolute inset-0 bg-secondary">
        <div className="w-full h-full bg-gradient-to-r from-secondary via-secondary/50 to-secondary animate-shimmer bg-[length:200%_100%]" />
      </div>
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      
      {/* Top Section Skeleton */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
        {/* Badge Skeleton */}
        <div className="w-20 h-6 bg-white/20 rounded-lg backdrop-blur-md" />
        {/* Menu Button Skeleton */}
        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md" />
      </div>

      {/* Bottom Section Skeleton */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
        {/* Title Skeleton */}
        <div className="w-3/4 h-7 bg-white/30 rounded mb-3" />
        {/* Date Skeleton */}
        <div className="w-32 h-4 bg-white/20 rounded" />
      </div>
    </div>
  );
};

export default ProjectCardSkeleton;

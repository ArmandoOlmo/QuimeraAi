
import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <div className="w-full h-full bg-gradient-to-r from-secondary via-secondary/50 to-secondary animate-shimmer bg-[length:200%_100%]" />
        
        {/* Badge Skeleton */}
        <div className="absolute top-3 left-3 z-10">
          <div className="w-16 h-5 bg-secondary/80 rounded-md" />
        </div>
        
        {/* Menu Button Skeleton */}
        <div className="absolute top-2 right-2 z-20">
          <div className="w-7 h-7 rounded-full bg-secondary/80" />
        </div>
      </div>

      {/* Card Footer Skeleton */}
      <div className="p-4 flex flex-col flex-grow bg-card">
        <div className="flex justify-between items-start mb-2 gap-3">
          {/* Title Skeleton */}
          <div className="flex-1 h-5 bg-secondary rounded" />
        </div>
        
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
          {/* Date Skeleton */}
          <div className="w-16 h-3 bg-secondary rounded" />
          {/* Version Skeleton */}
          <div className="w-8 h-3 bg-secondary rounded" />
        </div>
      </div>
    </div>
  );
};

export default ProjectCardSkeleton;

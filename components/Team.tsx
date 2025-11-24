
import React from 'react';
import { TeamData, PaddingSize, BorderRadiusSize, FontSize, TeamVariant, AnimationType } from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';

interface TeamMemberCardProps {
  imageUrl: string;
  name: string;
  role: string;
  delay?: string;
  variant?: TeamVariant;
  accentColor?: string;
  cardBackground?: string;
  animationType?: AnimationType;
  enableAnimation?: boolean;
}

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

const titleSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-7xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
};

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ 
  imageUrl, 
  name, 
  role, 
  delay = '0s', 
  variant = 'classic',
  accentColor = '#4f46e5',
  cardBackground = 'transparent',
  animationType = 'fade-in-up',
  enableAnimation = true
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  
  // Classic variant - simple circular images with text below
  if (variant === 'classic') {
    return (
      <div className={`text-center ${animationClass}`} style={{ animationDelay: delay }}>
        <img 
          src={imageUrl} 
          alt={name} 
          className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-4 object-cover border-4 shadow-lg transform transition-transform duration-300 hover:scale-105" 
          style={{ borderColor: accentColor }}
          key={imageUrl} 
        />
        <h3 className="text-xl font-bold text-site-heading mb-1 font-header">{name}</h3>
        <p className="text-primary font-semibold font-body" style={{ color: accentColor }}>{role}</p>
      </div>
    );
  }
  
  // Cards variant - elevated cards with hover effects
  if (variant === 'cards') {
    return (
      <div 
        className={`rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${animationClass}`}
        style={{ 
          animationDelay: delay,
          backgroundColor: cardBackground
        }}
      >
        <div className="relative overflow-hidden">
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-64 object-cover transform transition-transform duration-500 hover:scale-110" 
            key={imageUrl} 
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-site-heading mb-2 font-header">{name}</h3>
          <p className="font-semibold font-body" style={{ color: accentColor }}>{role}</p>
        </div>
      </div>
    );
  }
  
  // Minimal variant - clean modern layout with square images
  if (variant === 'minimal') {
    return (
      <div className={`group ${animationClass}`} style={{ animationDelay: delay }}>
        <div className="relative overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full aspect-square object-cover transform transition-all duration-300 group-hover:scale-105 filter grayscale group-hover:grayscale-0" 
            key={imageUrl} 
          />
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-site-heading mb-1 font-header">{name}</h3>
          <p 
            className="text-sm font-medium font-body uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            {role}
          </p>
        </div>
      </div>
    );
  }
  
  // Overlay variant - text overlays on image hover
  if (variant === 'overlay') {
    return (
      <div 
        className={`group relative overflow-hidden rounded-2xl shadow-xl cursor-pointer ${animationClass}`}
        style={{ animationDelay: delay }}
      >
        <div className="aspect-[3/4] relative">
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover" 
            key={imageUrl} 
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            {/* Role badge - always visible */}
            <div 
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 self-start"
              style={{ backgroundColor: accentColor }}
            >
              {role}
            </div>
            
            {/* Name - always visible but moves up on hover */}
            <h3 className="text-2xl font-bold font-header transform transition-transform duration-300 group-hover:-translate-y-2">
              {name}
            </h3>
            
            {/* Additional info appears on hover */}
            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 mt-2">
              <div className="w-12 h-1 mb-2" style={{ backgroundColor: accentColor }} />
              <p className="text-sm text-gray-300">
                Team Member
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

interface TeamProps extends TeamData {
    borderRadius: BorderRadiusSize;
}

const Team: React.FC<TeamProps> = ({ 
  title, 
  description, 
  items, 
  paddingY, 
  paddingX, 
  colors, 
  titleFontSize = 'md', 
  descriptionFontSize = 'md',
  teamVariant = 'classic',
  animationType = 'fade-in-up',
  enableCardAnimation = true
}) => {
  // Grid columns based on variant
  const gridClasses = {
    classic: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12',
    cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8',
    minimal: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6',
    overlay: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
  };

  return (
    <section 
      id="team" 
      className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} 
      style={{ backgroundColor: colors.background }}
    >
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 
            className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} 
            style={{ color: colors.heading }}
          >
            {title}
          </h2>
          <p 
            className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} 
            style={{ color: colors.text }}
          >
            {description}
          </p>
        </div>
        <div className={gridClasses[teamVariant]}>
          {items.map((member, index) => (
            <TeamMemberCard 
                key={index} 
                imageUrl={member.imageUrl}
                name={member.name}
                role={member.role}
                delay={getAnimationDelay(index, 0.15)}
                variant={teamVariant}
                accentColor={colors.accent || '#4f46e5'}
                cardBackground={colors.cardBackground || 'rgba(30, 41, 59, 0.5)'}
                animationType={animationType}
                enableAnimation={enableCardAnimation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;

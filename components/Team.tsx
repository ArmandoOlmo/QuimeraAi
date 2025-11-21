
import React from 'react';
import { TeamData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

interface TeamMemberCardProps {
  imageUrl: string;
  name: string;
  role: string;
  delay?: string;
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

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ imageUrl, name, role, delay = '0s' }) => (
  <div className="text-center animate-fade-in-up" style={{ animationDelay: delay }}>
    <img 
      src={imageUrl} 
      alt={name} 
      className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-4 object-cover border-4 border-dark-700 shadow-lg transform transition-transform duration-300 hover:scale-105" 
      key={imageUrl} 
    />
    <h3 className="text-xl font-bold text-site-heading mb-1 font-header">{name}</h3>
    <p className="text-primary font-semibold font-body" style={{ color: '#4f46e5'}}>{role}</p>
  </div>
);

interface TeamProps extends TeamData {
    borderRadius: BorderRadiusSize;
}

const Team: React.FC<TeamProps> = ({ title, description, items, paddingY, paddingX, colors, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  return (
    <section id="team" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {items.map((member, index) => (
            <TeamMemberCard 
                key={index} 
                imageUrl={member.imageUrl}
                name={member.name}
                role={member.role}
                delay={`${(index + 1) * 0.15}s`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;

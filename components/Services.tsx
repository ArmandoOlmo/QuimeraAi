
import React from 'react';
import { ServicesData, PaddingSize, BorderRadiusSize, ServiceIcon, FontSize } from '../types';
import { Code, Paintbrush2, Megaphone, BarChart, Scissors, Camera } from 'lucide-react';

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

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const serviceIcons: Record<ServiceIcon, React.ReactNode> = {
    code: <Code size={32} />,
    brush: <Paintbrush2 size={32} />,
    megaphone: <Megaphone size={32} />,
    chart: <BarChart size={32} />,
    scissors: <Scissors size={32} />,
    camera: <Camera size={32} />,
};

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, accentColor, textColor, borderRadius, borderColor }) => (
    <div 
        className={`bg-dark-800 p-8 text-center border-b-4 transition-all duration-300 group ${borderRadiusClasses[borderRadius]}`}
        style={{ borderColor: borderColor }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}
    >
        <div className="flex justify-center mb-6">
            <div className="bg-dark-900 p-4 inline-flex rounded-full text-site-heading" style={{color: accentColor}}>
                {icon}
            </div>
        </div>
        <h3 className="text-2xl font-bold text-site-heading mb-3 font-header">{title}</h3>
        <p className="font-body" style={{ color: textColor }}>{description}</p>
    </div>
);

interface ServicesProps extends ServicesData {
    borderRadius: BorderRadiusSize;
}

const Services: React.FC<ServicesProps> = ({ title, description, items, paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  return (
    <section id="services" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
        <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
                {description}
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((service, index) => (
                <ServiceCard 
                    key={index}
                    icon={serviceIcons[service.icon]}
                    title={service.title}
                    description={service.description}
                    accentColor={colors.accent}
                    textColor={colors.text}
                    borderRadius={borderRadius}
                    borderColor={colors.borderColor}
                />
            ))}
        </div>
    </section>
  );
};

export default Services;

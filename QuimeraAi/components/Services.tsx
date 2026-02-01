import React from 'react';
import { ServicesData, PaddingSize, BorderRadiusSize, ServiceIcon, FontSize, AnimationType, CornerGradientConfig } from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { hexToRgba, toHex } from '../utils/colorUtils';
import CornerGradient from './ui/CornerGradient';
import { 
    // Base icons
    Code, Paintbrush2, Megaphone, BarChart, Scissors, Camera, ArrowRight,
    // Development & Technology
    CodeSquare, Terminal, Cpu, Database, Server, Cloud, Wifi, Globe, Smartphone, Monitor,
    // Design & Creative
    Brush, Paintbrush, Palette, PenTool, Layout, Image, Video, Film,
    // Business & Marketing
    TrendingUp, PieChart, Target, Briefcase, DollarSign, CreditCard,
    // Communication
    Mail, MessageCircle, Phone, Send, Mic, Users, UserCheck, AtSign,
    // Social & Media
    Share2, Heart, Star, Bookmark, ThumbsUp, Eye, Hash, Instagram, Twitter, Facebook,
    // Tools & Services
    Wrench, Settings, Hammer, Package, Box, ShoppingCart, ShoppingBag, Gift, Truck,
    // Document & Files
    File, FileText, Folder, Book, Clipboard, Edit, Feather, Pen,
    // Location & Map
    MapPin, Map, Navigation, Compass, Home, Building, Store,
    // Time & Calendar
    Clock, Calendar, Timer, Watch, Hourglass,
    // Security & Protection
    Shield, Lock, Key, EyeOff, CheckCircle, AlertCircle,
    // Food & Hospitality
    Utensils, Coffee, Wine, Beer, UtensilsCrossed, ChefHat, CakeSlice, Pizza, Soup, Salad,
    // Other
    Zap, Award, Trophy, Rocket, Lightbulb, Sparkles, CircleDot, Hexagon, Layers
} from 'lucide-react';

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
  xl: 'py-24 md:py-40',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
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
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-[2rem]',
};

const serviceIcons: Record<ServiceIcon, React.ReactNode> = {
    // Development & Technology
    code: <Code size={32} />,
    code2: <CodeSquare size={32} />,
    terminal: <Terminal size={32} />,
    cpu: <Cpu size={32} />,
    database: <Database size={32} />,
    server: <Server size={32} />,
    cloud: <Cloud size={32} />,
    wifi: <Wifi size={32} />,
    globe: <Globe size={32} />,
    smartphone: <Smartphone size={32} />,
    monitor: <Monitor size={32} />,
    // Design & Creative
    brush: <Brush size={32} />,
    paintbrush: <Paintbrush size={32} />,
    palette: <Palette size={32} />,
    'pen-tool': <PenTool size={32} />,
    layout: <Layout size={32} />,
    image: <Image size={32} />,
    camera: <Camera size={32} />,
    video: <Video size={32} />,
    film: <Film size={32} />,
    scissors: <Scissors size={32} />,
    // Business & Marketing
    megaphone: <Megaphone size={32} />,
    'trending-up': <TrendingUp size={32} />,
    chart: <BarChart size={32} />,
    'bar-chart': <BarChart size={32} />,
    'pie-chart': <PieChart size={32} />,
    target: <Target size={32} />,
    briefcase: <Briefcase size={32} />,
    'dollar-sign': <DollarSign size={32} />,
    'credit-card': <CreditCard size={32} />,
    // Communication
    mail: <Mail size={32} />,
    'message-circle': <MessageCircle size={32} />,
    phone: <Phone size={32} />,
    send: <Send size={32} />,
    mic: <Mic size={32} />,
    users: <Users size={32} />,
    'user-check': <UserCheck size={32} />,
    'at-sign': <AtSign size={32} />,
    // Social & Media
    'share-2': <Share2 size={32} />,
    heart: <Heart size={32} />,
    star: <Star size={32} />,
    bookmark: <Bookmark size={32} />,
    'thumbs-up': <ThumbsUp size={32} />,
    eye: <Eye size={32} />,
    hash: <Hash size={32} />,
    instagram: <Instagram size={32} />,
    twitter: <Twitter size={32} />,
    facebook: <Facebook size={32} />,
    // Tools & Services
    wrench: <Wrench size={32} />,
    settings: <Settings size={32} />,
    tool: <Hammer size={32} />,
    package: <Package size={32} />,
    box: <Box size={32} />,
    'shopping-cart': <ShoppingCart size={32} />,
    'shopping-bag': <ShoppingBag size={32} />,
    gift: <Gift size={32} />,
    truck: <Truck size={32} />,
    // Document & Files
    file: <File size={32} />,
    'file-text': <FileText size={32} />,
    folder: <Folder size={32} />,
    book: <Book size={32} />,
    clipboard: <Clipboard size={32} />,
    edit: <Edit size={32} />,
    feather: <Feather size={32} />,
    pen: <Pen size={32} />,
    // Location & Map
    'map-pin': <MapPin size={32} />,
    map: <Map size={32} />,
    navigation: <Navigation size={32} />,
    compass: <Compass size={32} />,
    home: <Home size={32} />,
    building: <Building size={32} />,
    store: <Store size={32} />,
    // Time & Calendar
    clock: <Clock size={32} />,
    calendar: <Calendar size={32} />,
    timer: <Timer size={32} />,
    watch: <Watch size={32} />,
    hourglass: <Hourglass size={32} />,
    // Security & Protection
    shield: <Shield size={32} />,
    lock: <Lock size={32} />,
    key: <Key size={32} />,
    'eye-off': <EyeOff size={32} />,
    'check-circle': <CheckCircle size={32} />,
    'alert-circle': <AlertCircle size={32} />,
    // Food & Hospitality
    utensils: <Utensils size={32} />,
    coffee: <Coffee size={32} />,
    wine: <Wine size={32} />,
    beer: <Beer size={32} />,
    'utensils-crossed': <UtensilsCrossed size={32} />,
    'chef-hat': <ChefHat size={32} />,
    'cake-slice': <CakeSlice size={32} />,
    pizza: <Pizza size={32} />,
    soup: <Soup size={32} />,
    salad: <Salad size={32} />,
    // Other
    zap: <Zap size={32} />,
    award: <Award size={32} />,
    trophy: <Trophy size={32} />,
    rocket: <Rocket size={32} />,
    lightbulb: <Lightbulb size={32} />,
    sparkles: <Sparkles size={32} />,
    'circle-dot': <CircleDot size={32} />,
    hexagon: <Hexagon size={32} />,
    layers: <Layers size={32} />,
};

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  headingColor: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  cardBackground: string;
  variant: 'cards' | 'grid' | 'minimal';
  index: number;
  animationType?: AnimationType;
  enableAnimation?: boolean;
  delay?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  icon, 
  title, 
  description, 
  accentColor, 
  headingColor,
  textColor, 
  borderRadius, 
  borderColor, 
  cardBackground,
  variant,
  animationType = 'fade-in-up',
  enableAnimation = true,
  delay = '0s'
}) => {
    const radiusClass = borderRadiusClasses[borderRadius];
    const animationClass = getAnimationClass(animationType, enableAnimation);

    // VARIANT 1: CLASSIC CARDS
    if (variant === 'cards') {
        return (
            <div 
                className={`p-8 text-center border border-transparent hover:border-opacity-50 transition-all duration-300 group ${radiusClass} ${animationClass} relative overflow-hidden`}
                style={{ backgroundColor: cardBackground, borderColor: borderColor, animationDelay: delay }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex justify-center mb-6">
                    <div 
                        className="p-4 inline-flex rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" 
                        style={{ backgroundColor: hexToRgba(accentColor, 0.125), color: accentColor }}
                    >
                        {icon}
                    </div>
                </div>
                <h3 className="relative z-10 text-2xl font-bold mb-3 font-header group-hover:text-[var(--accent)] transition-colors" style={{ color: headingColor, '--accent': accentColor, textTransform: 'var(--headings-transform, none)', letterSpacing: 'var(--headings-spacing, normal)' } as any}>
                    {title}
                </h3>
                <p className="relative z-10 font-body opacity-80 leading-relaxed" style={{ color: textColor }}>{description}</p>
            </div>
        );
    }

    // VARIANT 2: MODERN GRID (Bento Style)
    if (variant === 'grid') {
        return (
            <div 
                className={`h-full p-8 flex flex-col items-start text-left transition-all duration-300 group hover:-translate-y-1 ${radiusClass} ${animationClass}`}
                style={{ 
                    backgroundColor: cardBackground, 
                    borderLeft: `4px solid ${accentColor}`,
                    animationDelay: delay
                }}
            >
                <div className="mb-6 p-3 rounded-lg bg-white/5 text-white group-hover:bg-[var(--accent)] group-hover:text-white transition-colors duration-300" style={{'--accent': accentColor} as any}>
                     {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
                </div>
                <h3 className="text-xl font-bold mb-3 font-header" style={{ color: headingColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h3>
                <p className="font-body text-sm opacity-70 mb-6 flex-grow" style={{ color: textColor }}>{description}</p>
                
                <div className="mt-auto pt-4 flex items-center text-sm font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" style={{ color: accentColor }}>
                    Learn more <ArrowRight size={16} className="ml-2" />
                </div>
            </div>
        );
    }

    // VARIANT 3: MINIMAL LIST
    if (variant === 'minimal') {
        return (
            <div className={`flex gap-6 p-6 transition-all duration-300 ${radiusClass} ${animationClass}`} style={{ backgroundColor: cardBackground, animationDelay: delay }}>
                <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.08), color: accentColor }}>
                        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2 font-header flex items-center gap-2" style={{ color: headingColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                        {title}
                    </h3>
                    <p className="font-body leading-relaxed opacity-80" style={{ color: textColor }}>{description}</p>
                </div>
            </div>
        );
    }

    return null;
};

interface ServicesProps extends ServicesData {
    borderRadius: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

const Services: React.FC<ServicesProps> = ({ 
    title, 
    description, 
    items = [], 
    paddingY, 
    paddingX, 
    colors, 
    borderRadius, 
    titleFontSize = 'md', 
    descriptionFontSize = 'md',
    servicesVariant = 'cards', // Default
    animationType = 'fade-in-up',
    enableCardAnimation = true,
    cornerGradient
}) => {
  // Get design tokens for primary color - use as fallback with 75% opacity
  const { colors: tokenColors } = useDesignTokens();
  const sectionBackground = colors?.background || hexToRgba(tokenColors.primary, 0.75);
  
  return (
    <section id="services" className="w-full relative overflow-hidden" style={{ backgroundColor: sectionBackground }}>
      <CornerGradient config={cornerGradient} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className={`max-w-3xl mx-auto mb-16 ${servicesVariant === 'minimal' ? 'text-left md:text-center' : 'text-center'}`}>
            {servicesVariant === 'grid' && (
                <span className="inline-block py-1 px-3 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ backgroundColor: hexToRgba(colors?.accent, 0.125), color: colors?.accent }}>
                    Our Services
                </span>
            )}
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-6 font-header`} style={{ color: colors?.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body max-w-2xl mx-auto`} style={{ color: colors?.description || colors?.text }}>
                {description}
            </p>
        </div>
        
        <div className={`
            grid gap-8
            ${servicesVariant === 'minimal' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 gap-y-8' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}
        `}>
            {items.map((service, index) => (
                <ServiceCard 
                    key={index}
                    index={index}
                    icon={serviceIcons[service.icon]}
                    title={service.title}
                    description={service.description}
                    accentColor={colors?.accent}
                    headingColor={(colors as any)?.cardHeading || '#ffffff'}
                    textColor={(colors as any)?.cardText || colors?.text || '#94a3b8'}
                    borderRadius={borderRadius}
                    borderColor={colors?.borderColor}
                    cardBackground={colors?.cardBackground || 'rgba(255,255,255,0.05)'}
                    variant={servicesVariant}
                    animationType={animationType}
                    enableAnimation={enableCardAnimation}
                    delay={getAnimationDelay(index)}
                />
            ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

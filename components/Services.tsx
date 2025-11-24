import React from 'react';
import { ServicesData, PaddingSize, BorderRadiusSize, ServiceIcon, FontSize } from '../types';
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
    // Other
    Zap, Award, Trophy, Rocket, Lightbulb, Sparkles, CircleDot, Hexagon, Layers
} from 'lucide-react';

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
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  variant: 'cards' | 'grid' | 'minimal';
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, accentColor, textColor, borderRadius, borderColor, variant }) => {
    const radiusClass = borderRadiusClasses[borderRadius];

    // VARIANT 1: CLASSIC CARDS
    if (variant === 'cards') {
        return (
            <div 
                className={`bg-white/5 p-8 text-center border border-transparent hover:border-opacity-50 transition-all duration-300 group ${radiusClass} relative overflow-hidden`}
                style={{ borderColor: borderColor }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex justify-center mb-6">
                    <div 
                        className="p-4 inline-flex rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 shadow-lg" 
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                        {icon}
                    </div>
                </div>
                <h3 className="relative z-10 text-2xl font-bold mb-3 font-header text-inherit group-hover:text-[var(--accent)] transition-colors" style={{'--accent': accentColor} as any}>
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
                className={`h-full p-8 flex flex-col items-start text-left transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl ${radiusClass}`}
                style={{ 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    borderLeft: `4px solid ${accentColor}` 
                }}
            >
                <div className="mb-6 p-3 rounded-lg bg-white/5 text-white group-hover:bg-[var(--accent)] group-hover:text-white transition-colors duration-300" style={{'--accent': accentColor} as any}>
                     {React.cloneElement(icon as React.ReactElement, { size: 24 })}
                </div>
                <h3 className="text-xl font-bold mb-3 font-header">{title}</h3>
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
            <div className={`flex gap-6 p-6 transition-all duration-300 hover:bg-white/5 ${radiusClass}`}>
                <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2 font-header flex items-center gap-2">
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
}

const Services: React.FC<ServicesProps> = ({ 
    title, 
    description, 
    items, 
    paddingY, 
    paddingX, 
    colors, 
    borderRadius, 
    titleFontSize = 'md', 
    descriptionFontSize = 'md',
    servicesVariant = 'cards' // Default
}) => {
  return (
    <section id="services" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
        <div className={`max-w-3xl mx-auto mb-16 ${servicesVariant === 'minimal' ? 'text-left md:text-center' : 'text-center'}`}>
            {servicesVariant === 'grid' && (
                <span className="inline-block py-1 px-3 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}>
                    Our Services
                </span>
            )}
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-6 font-header`} style={{ color: colors.heading }}>{title}</h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body max-w-2xl mx-auto opacity-90`} style={{ color: colors.text }}>
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
                    accentColor={colors.accent}
                    textColor={colors.text}
                    borderRadius={borderRadius}
                    borderColor={colors.borderColor}
                    variant={servicesVariant}
                />
            ))}
        </div>
    </section>
  );
};

export default Services;

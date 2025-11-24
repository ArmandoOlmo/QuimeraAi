
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { auth, signOut } from '../../firebase';
import { LogOut, LayoutDashboard, Globe, Settings, ChevronLeft, ChevronRight, Zap, User as UserIcon, Images, PenTool, Menu as MenuIcon, Sun, Moon, Circle, MessageSquare, Users, Link2, Search } from 'lucide-react';

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  hiddenOnDesktop?: boolean;
  defaultCollapsed?: boolean;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isMobileOpen, onClose, hiddenOnDesktop = false, defaultCollapsed = false }) => {
  const { t } = useTranslation();
  const { user, setView, userDocument, view, setAdminView, themeMode, setThemeMode, usage, isLoadingUsage } = useEditor();
  // Default to expanded on desktop, unless defaultCollapsed is true
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.error("Sign out error", error));
  };

  const NavItem = ({ icon: Icon, label, isActive, onClick, disabled = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group flex items-center p-3 mb-2 transition-all duration-300
        ${isCollapsed 
            ? 'justify-center w-12 mx-auto rounded-lg' 
            : 'w-full rounded-xl'
        }
        ${isActive 
          ? (isCollapsed 
              ? 'text-primary dark:text-primary' 
              : 'bg-primary text-white font-bold shadow-[0_0_15px_rgba(251,185,43,0.4)]' 
            ) 
          : (isCollapsed
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} className={`${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} aria-hidden="true" />
      
      {!isCollapsed && (
        <span className="text-sm whitespace-nowrap overflow-hidden transition-all">
            {label}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside 
        className={`
            fixed lg:relative z-40 h-screen bg-background border-r border-border shadow-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'w-[80px]' : 'w-72'}
            ${hiddenOnDesktop ? 'lg:hidden' : ''}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header / Logo */}
        <div className="relative h-[80px] flex items-center justify-center">
            <div className={`relative h-full flex items-center transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-6 w-full gap-3'}`}>
                 {/* Logo Image */}
                <img 
                    src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
                    alt="Quimera Logo" 
                    className="w-10 h-10 object-contain flex-shrink-0" 
                />
                 {/* Text Logo (Hidden when collapsed) */}
                <span className={`text-2xl font-extrabold tracking-tight text-foreground whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    Quimera<span className="text-primary">.ai</span>
                </span>
            </div>
             {/* Toggle Button (Centered vertically relative to header height, always on the line) */}
            <div className="hidden lg:block absolute top-[calc(50%-12px)] -translate-y-1/2 z-50 -right-3">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-md"
                    aria-label={isCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
                    aria-expanded={!isCollapsed}
                >
                    {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
                </button>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar" role="navigation" aria-label="Main navigation">
            <NavItem 
                icon={LayoutDashboard} 
                label={t('dashboard.title')} 
                isActive={view === 'dashboard'} 
                onClick={() => setView('dashboard')} 
            />
            <NavItem 
                icon={Globe} 
                label={t('dashboard.myWebsites')} 
                isActive={view === 'websites'} 
                onClick={() => setView('websites')} 
            />
            <NavItem 
                icon={Link2} 
                label={t('domains.title')} 
                isActive={view === 'domains'} 
                onClick={() => setView('domains')} 
            />
            <NavItem 
                icon={MessageSquare} 
                label={t('dashboard.quimeraChat')} 
                isActive={view === 'ai-assistant'} 
                onClick={() => setView('ai-assistant')} 
            />
            <NavItem 
                icon={Users} 
                label={t('leads.title')} 
                isActive={view === 'leads'} 
                onClick={() => setView('leads')} 
            />
            <NavItem 
                icon={MenuIcon} 
                label={t('dashboard.navigation')} 
                isActive={view === 'navigation'} 
                onClick={() => setView('navigation')} 
            />
             <NavItem 
                icon={PenTool} 
                label={t('dashboard.contentManager')} 
                isActive={view === 'cms'} 
                onClick={() => setView('cms')} 
            />
            <NavItem 
                icon={Search} 
                label={t('dashboard.seoAndMeta')} 
                isActive={view === 'seo'} 
                onClick={() => setView('seo')} 
            />
            <NavItem 
                icon={Images} 
                label={t('dashboard.assetLibrary')} 
                isActive={view === 'assets'} 
                onClick={() => setView('assets')} 
            />
             
            {/* Panel de administración disponible para todos los usuarios */}
            <>
                <div className={`my-4 border-t border-border ${isCollapsed ? 'mx-2' : 'mx-0'}`} />
                <NavItem 
                    icon={Settings} 
                    label={t('dashboard.superAdmin')} 
                    isActive={view === 'superadmin'} 
                    onClick={() => {
                        setView('superadmin');
                        setAdminView('main');
                    }} 
                />
            </>
        </nav>

        {/* Footer / User Profile / Theme */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            
            {/* Theme Selector Section */}
            <div className={`${isCollapsed ? 'hidden' : 'block mb-4'}`}>
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('common.themeColor')}</p>
                 <div className="flex gap-2 bg-muted p-1 rounded-lg">
                     <button 
                        onClick={() => setThemeMode('light')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'light' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        title={t('common.lightMode')}
                     >
                         <Sun size={16} />
                     </button>
                     <button 
                        onClick={() => setThemeMode('dark')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'dark' ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                        title={t('common.darkMode')}
                     >
                         <Moon size={16} />
                     </button>
                     <button 
                        onClick={() => setThemeMode('black')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'black' ? 'bg-card text-primary border border-primary/30 shadow-sm shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                        title={t('common.blackMode')}
                     >
                         <Circle size={16} fill="currentColor" />
                     </button>
                 </div>
            </div>

            {/* REFINED PRO PLAN WIDGET - Hidden when collapsed */}
            <div className={`px-1 ${isCollapsed ? 'hidden' : 'block mb-6'}`}>
                <div className="flex justify-between items-end mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                        <Zap size={14} className="text-yellow-600 dark:text-yellow-400 black:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 black:fill-yellow-400"/> 
                        <span className="text-xs font-bold text-gray-700 dark:text-white tracking-wide">
                            {isLoadingUsage ? t('common.loading') : usage?.plan || t('common.proPlan')}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 dark:text-white/60">
                        {isLoadingUsage ? '...' : `${usage?.used || 0}/${usage?.limit || 1000}`}
                    </span>
                </div>
                
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(251,185,43,0.5)] transition-all duration-500" 
                        style={{ width: `${usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0}%` }}
                    />
                </div>
                
                <div className="mt-2 flex justify-between items-center px-1">
                     <span className="text-[10px] text-muted-foreground font-medium">{t('common.monthlyCredits')}</span>
                     <button className="text-[10px] font-bold text-gray-700 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">{t('common.upgrade')}</button>
                </div>
            </div>

            <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
                <div className="relative group cursor-pointer">
                     {user?.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                     ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                            <UserIcon size={20} className="text-muted-foreground" />
                        </div>
                     )}
                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                </div>
                
            {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-foreground truncate">{userDocument?.name || t('common.creator')}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
            )}

                <div className={`${isCollapsed ? '' : 'flex flex-col gap-1'}`}>
                     {!isCollapsed && (
                        <button 
                          onClick={handleSignOut} 
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" 
                          aria-label={t('auth.logout')}
                        >
                            <LogOut size={16} aria-hidden="true" />
                        </button>
                     )}
                </div>
            </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;

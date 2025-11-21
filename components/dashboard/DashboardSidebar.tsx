
import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { auth, signOut } from '../../firebase';
import { LogOut, LayoutDashboard, Globe, Settings, ChevronLeft, ChevronRight, Zap, User as UserIcon, Images, PenTool, Menu as MenuIcon, Sun, Moon, Circle, MessageSquare, Users, Link2 } from 'lucide-react';

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  hiddenOnDesktop?: boolean;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isMobileOpen, onClose, hiddenOnDesktop = false }) => {
  const { user, setView, userDocument, view, setAdminView, themeMode, setThemeMode } = useEditor();
  // Default to expanded on desktop
  const [isCollapsed, setIsCollapsed] = useState(false);

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
              ? 'text-yellow-600 dark:text-yellow-400' 
              : 'bg-yellow-400 text-black font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
            ) 
          : (isCollapsed
              ? 'text-gray-500 dark:text-muted-foreground hover:text-black dark:hover:text-foreground'
              : 'text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-foreground'
            )
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} className={`${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
      
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
            fixed lg:relative z-40 h-screen bg-white dark:bg-[#1A0D26] black:bg-black border-r border-gray-200 dark:border-white/10 black:border-white/10 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'w-[80px]' : 'w-72'}
            ${hiddenOnDesktop ? 'lg:hidden' : ''}
        `}
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
                <span className={`text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white black:text-white whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    Quimera<span className="text-yellow-400">.ai</span>
                </span>
            </div>
             {/* Toggle Button (Centered vertically relative to header height, always on the line) */}
            <div className="hidden lg:block absolute top-[calc(50%-3px)] -translate-y-1/2 z-50 -right-3">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-6 h-6 bg-gray-100 dark:bg-[#2C1A3D] black:bg-[#262626] border border-gray-200 dark:border-white/10 black:border-white/10 rounded-full flex items-center justify-center text-gray-500 dark:text-muted-foreground hover:text-black dark:hover:text-white transition-all shadow-sm"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                isActive={view === 'dashboard'} 
                onClick={() => setView('dashboard')} 
            />
            <NavItem 
                icon={Globe} 
                label="My Websites" 
                isActive={view === 'websites'} 
                onClick={() => setView('websites')} 
            />
            <NavItem 
                icon={Link2} 
                label="Domains" 
                isActive={view === 'domains'} 
                onClick={() => setView('domains')} 
            />
            <NavItem 
                icon={MessageSquare} 
                label="Quimera Chat" 
                isActive={view === 'ai-assistant'} 
                onClick={() => setView('ai-assistant')} 
            />
            <NavItem 
                icon={Users} 
                label="Leads CRM" 
                isActive={view === 'leads'} 
                onClick={() => setView('leads')} 
            />
            <NavItem 
                icon={MenuIcon} 
                label="Navigation" 
                isActive={view === 'navigation'} 
                onClick={() => setView('navigation')} 
            />
             <NavItem 
                icon={PenTool} 
                label="Content Manager" 
                isActive={view === 'cms'} 
                onClick={() => setView('cms')} 
            />
            <NavItem 
                icon={Images} 
                label="Asset Library" 
                isActive={view === 'assets'} 
                onClick={() => setView('assets')} 
            />
             
            {userDocument?.role === 'superadmin' && (
                <>
                    <div className={`my-4 border-t border-gray-200 dark:border-white/10 black:border-white/10 ${isCollapsed ? 'mx-2' : 'mx-0'}`} />
                    <NavItem 
                        icon={Settings} 
                        label="Super Admin" 
                        isActive={view === 'superadmin'} 
                        onClick={() => {
                            setView('superadmin');
                            setAdminView('main');
                        }} 
                    />
                </>
            )}
        </nav>

        {/* Footer / User Profile / Theme */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 black:border-white/10 bg-gray-50 dark:bg-[#2C1A3D]/30 black:bg-black">
            
            {/* Theme Selector Section */}
            <div className={`mb-4 ${isCollapsed ? 'hidden' : ''}`}>
                 <p className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Theme Color</p>
                 <div className="flex gap-2 bg-gray-200 dark:bg-white/5 black:bg-white/5 p-1 rounded-lg">
                     <button 
                        onClick={() => setThemeMode('light')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        title="Light Mode"
                     >
                         <Sun size={16} />
                     </button>
                     <button 
                        onClick={() => setThemeMode('dark')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'dark' ? 'bg-[#2C1A3D] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        title="Dark Mode"
                     >
                         <Moon size={16} />
                     </button>
                     <button 
                        onClick={() => setThemeMode('black')}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${themeMode === 'black' ? 'bg-black text-yellow-400 border border-yellow-400/30 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                        title="Black Mode"
                     >
                         <Circle size={16} fill="currentColor" />
                     </button>
                 </div>
            </div>

            {!isCollapsed && (
                 /* REFINED PRO PLAN WIDGET */
                 <div className="mb-6 px-1">
                    <div className="flex justify-between items-end mb-2 px-1">
                        <div className="flex items-center gap-1.5">
                            <Zap size={14} className="text-yellow-600 dark:text-yellow-400 black:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 black:fill-yellow-400"/> 
                            <span className="text-xs font-bold text-gray-700 dark:text-white tracking-wide">Pro Plan</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 dark:text-white/60">850/1k</span>
                    </div>
                    
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 black:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-[85%] bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                    </div>
                    
                    <div className="mt-2 flex justify-between items-center px-1">
                         <span className="text-[10px] text-gray-400 dark:text-white/40 font-medium">Monthly credits</span>
                         <button className="text-[10px] font-bold text-gray-700 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">Upgrade</button>
                    </div>
                 </div>
            )}

            <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
                <div className="relative group cursor-pointer">
                     {user?.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-white/10 black:border-white/10 group-hover:border-yellow-400 transition-colors" />
                     ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-secondary black:bg-secondary flex items-center justify-center border-2 border-gray-200 dark:border-border black:border-border group-hover:border-yellow-400 transition-colors">
                            <UserIcon size={20} className="text-gray-400 dark:text-muted-foreground" />
                        </div>
                     )}
                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1A0D26] black:border-black rounded-full"></div>
                </div>
                
                {!isCollapsed && (
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userDocument?.name || 'Creator'}</p>
                        <p className="text-xs text-gray-500 dark:text-white/50 truncate">{user?.email}</p>
                    </div>
                )}

                <div className={`${isCollapsed ? '' : 'flex flex-col gap-1'}`}>
                     {!isCollapsed && (
                        <button onClick={handleSignOut} className="p-1.5 text-gray-400 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Sign Out">
                            <LogOut size={16} />
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

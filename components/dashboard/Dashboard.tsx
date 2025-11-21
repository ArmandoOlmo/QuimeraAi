
import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import DashboardSidebar from './DashboardSidebar';
import ProjectCard from './ProjectCard';
import StatCard from './StatCard';
import FileHistory from './FileHistory';
import { Plus, Menu, Search, LayoutGrid, Globe, Images } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { 
    userDocument, 
    projects, 
    view, 
    setView, 
    setIsOnboardingOpen
  } = useEditor();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // View States
  const isDashboard = view === 'dashboard';
  const isWebsites = view === 'websites';
  const isAssets = view === 'assets';

  // Filter projects
  const userProjects = projects.filter(p => p.status !== 'Template' && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const templates = projects.filter(p => p.status === 'Template');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Header Config
  let HeaderIcon = LayoutGrid;
  let headerTitle = 'Dashboard';

  if (isWebsites) {
      HeaderIcon = Globe;
      headerTitle = 'My Websites';
  } else if (isAssets) {
      HeaderIcon = Images;
      headerTitle = 'Asset Library';
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
       <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
       
       <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Standardized Header */}
          <header className="h-[65px] px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                   <Menu />
                </button>
                <div className="flex items-center gap-2">
                    <HeaderIcon className="text-primary" size={24} />
                    <h1 className="text-xl font-bold text-foreground">{headerTitle}</h1>
                </div>
             </div>

             <div className="flex items-center gap-4 flex-1 justify-end">
                {/* Search Bar - Visible on Dashboard & Websites */}
                {(isDashboard || isWebsites) && (
                    <div className="relative group max-w-md w-full hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/50 border-transparent focus:bg-card focus:border-primary/50 rounded-lg py-1.5 pl-9 pr-4 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                        />
                    </div>
                )}

                <button 
                    onClick={() => setIsOnboardingOpen(true)}
                    className="bg-yellow-400 text-black font-bold py-1.5 px-4 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:scale-105 transition-all flex items-center text-sm"
                >
                    <Plus size={18} className="mr-2" />
                    <span className="hidden sm:inline">New Project</span>
                    <span className="sm:hidden">New</span>
                </button>
             </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
             <div className="max-w-7xl mx-auto space-y-10 h-full">
             
                {/* Hero / Welcome Section - Only on Dashboard */}
                {isDashboard && (
                    <section className="w-full">
                        <div className="flex flex-col justify-center py-6">
                            {/* Greeting Header */}
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4 flex items-center flex-wrap">
                                <img 
                                    src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
                                    alt="Quimera Logo" 
                                    className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" 
                                />
                                <span>
                                    {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{userDocument?.name?.split(' ')[0] || 'Creator'}</span>.
                                </span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                                Ready to design the future? You have <span className="text-foreground font-semibold">{userProjects.length} active projects</span> and your creative energy is high.
                            </p>
                            
                            {/* Inline Stats */}
                            <div className="flex items-center gap-8 mt-2">
                                 <div className="flex items-center gap-3 group cursor-default">
                                    <div className="p-2.5 rounded-xl bg-yellow-400/10 text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-colors duration-300">
                                        <LayoutGrid size={22} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-extrabold text-foreground leading-none">{userProjects.length}</span>
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Total Projects</span>
                                    </div>
                                 </div>

                                 <div className="h-10 w-px bg-border mx-2"></div>

                                 <div className="flex items-center gap-3 group cursor-default">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                        <Globe size={22} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-extrabold text-foreground leading-none">{userProjects.filter(p => p.status === 'Published').length}</span>
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Published</span>
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Projects Section */}
                {(isDashboard || isWebsites) && (
                    <section>
                        {/* Only show section header on Dashboard view, since Websites view has it in main header */}
                        {isDashboard && (
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-foreground flex items-center">
                                Recent Projects
                                </h2>
                                {userProjects.length > 0 && (
                                <button onClick={() => setView('websites')} className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center">
                                    View All <Globe size={14} className="ml-1" />
                                </button>
                                )}
                            </div>
                        )}
                        
                        {isWebsites && (
                            <div className="mb-6 flex items-center">
                                <span className="px-2 py-1 bg-secondary/50 text-xs rounded-full text-muted-foreground">
                                    {userProjects.length} Projects Found
                                </span>
                            </div>
                        )}

                        {userProjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                               {(isWebsites ? userProjects : userProjects.slice(0, 4)).map(project => (
                                  <ProjectCard key={project.id} project={project} />
                               ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-card/30 rounded-3xl border border-dashed border-border/50">
                               <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <LayoutGrid className="text-muted-foreground opacity-50" />
                                </div>
                               <p className="text-muted-foreground">No projects found.</p>
                               <button 
                                    onClick={() => setIsOnboardingOpen(true)}
                                    className="mt-4 text-yellow-400 font-bold hover:underline"
                               >
                                   Create New Project
                               </button>
                            </div>
                        )}
                    </section>
                )}

                {/* Templates Section (Only on Dashboard) */}
                {isDashboard && (
                   <section>
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-foreground flex items-center">
                              Start from Template
                          </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {templates.slice(0, 4).map(template => (
                              <ProjectCard key={template.id} project={template} />
                          ))}
                      </div>
                   </section>
                )}
                
                {/* File History (Dashboard Widget) */}
                {isDashboard && (
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
                            <Images size={20} className="mr-2 text-primary" /> Recent Assets
                        </h2>
                        <FileHistory variant="widget" />
                    </section>
                )}

                {/* File History (Full Assets View) */}
                {isAssets && (
                    <section className="h-full flex flex-col">
                        {/* Header title moved to top bar, just rendering content now */}
                        <div className="flex-1">
                            <FileHistory variant="full" />
                        </div>
                    </section>
                )}
                
             </div>
          </main>
          
       </div>
    </div>
  );
};

export default Dashboard;

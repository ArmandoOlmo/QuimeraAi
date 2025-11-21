
import React, { useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { Menu, Search, Plus, Link2, CheckCircle, AlertTriangle, Clock, Copy, Globe, ShoppingCart, ExternalLink, RefreshCw, Loader2, X, Trash2, Settings } from 'lucide-react';
import Modal from '../../ui/Modal';
import { Domain } from '../../../types';
import { GoogleGenAI } from '@google/genai';

// --- DNS CONFIG COMPONENT ---
const DNSConfig: React.FC<{ domain: Domain }> = ({ domain }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Copied: ${text}`);
    };

    return (
        <div className="bg-secondary/20 rounded-xl p-6 border border-border mt-4">
            <h4 className="font-bold text-foreground mb-2 flex items-center">
                <Settings size={16} className="mr-2 text-primary" /> DNS Configuration
            </h4>
            <p className="text-sm text-muted-foreground mb-6">
                To connect <strong>{domain.name}</strong>, log in to your domain provider (GoDaddy, Namecheap, Google, etc.) and add the following records to your DNS settings.
            </p>

            <div className="space-y-4">
                {/* A Record */}
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 text-blue-500 font-bold px-2 py-1 rounded text-xs border border-blue-500/20">A Record</div>
                        <div className="text-sm text-muted-foreground">
                            Host: <span className="text-foreground font-mono bg-secondary px-1 rounded">@</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <code className="flex-1 md:flex-none bg-secondary px-3 py-1.5 rounded text-sm font-mono text-foreground border border-border">76.76.21.21</code>
                        <button onClick={() => copyToClipboard('76.76.21.21')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors" title="Copy Value">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                {/* CNAME Record */}
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/10 text-purple-500 font-bold px-2 py-1 rounded text-xs border border-purple-500/20">CNAME</div>
                        <div className="text-sm text-muted-foreground">
                            Host: <span className="text-foreground font-mono bg-secondary px-1 rounded">www</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <code className="flex-1 md:flex-none bg-secondary px-3 py-1.5 rounded text-sm font-mono text-foreground border border-border">cname.quimera.ai</code>
                        <button onClick={() => copyToClipboard('cname.quimera.ai')} className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors" title="Copy Value">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 flex justify-end">
                <a 
                    href="https://support.google.com/domains/answer/3290350?hl=en" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center underline"
                >
                    Need help? Read the guide <ExternalLink size={12} className="ml-1"/>
                </a>
            </div>
        </div>
    );
};

// --- DOMAIN CARD COMPONENT ---
const DomainCard: React.FC<{ domain: Domain }> = ({ domain }) => {
    const { deleteDomain, verifyDomain, projects, updateDomain } = useEditor();
    const [isVerifying, setIsVerifying] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const handleVerify = async () => {
        setIsVerifying(true);
        await verifyDomain(domain.id);
        setIsVerifying(false);
    };
    
    const handleProjectChange = (projectId: string) => {
        updateDomain(domain.id, { projectId });
    };

    const connectedProject = projects.find(p => p.id === domain.projectId);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            {domain.name}
                            <a href={`https://${domain.name}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink size={14}/></a>
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {domain.status === 'active' && <span className="text-xs font-bold text-green-500 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20"><CheckCircle size={12} className="mr-1"/> Connected</span>}
                            {domain.status === 'pending' && <span className="text-xs font-bold text-yellow-500 flex items-center bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20"><Clock size={12} className="mr-1"/> DNS Pending</span>}
                            {domain.status === 'error' && <span className="text-xs font-bold text-red-500 flex items-center bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><AlertTriangle size={12} className="mr-1"/> Configuration Error</span>}
                            <span className="text-xs text-muted-foreground">• {domain.provider}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleVerify} 
                            disabled={isVerifying}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors" 
                            title="Verify DNS"
                        >
                            <RefreshCw size={18} className={isVerifying ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => {if(window.confirm('Delete domain?')) deleteDomain(domain.id)}} 
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                         <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Connected Project</label>
                         <select 
                            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={domain.projectId || ''}
                            onChange={(e) => handleProjectChange(e.target.value)}
                        >
                            <option value="">-- No Project --</option>
                            {projects.filter(p => p.status !== 'Template').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expiry Date</label>
                        <div className="text-sm text-foreground bg-secondary/10 px-3 py-2 rounded-lg border border-border">
                            {domain.expiryDate ? new Date(domain.expiryDate).toLocaleDateString() : 'Auto-renew'}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm font-medium text-primary hover:underline flex items-center"
                >
                    {showDetails ? 'Hide DNS Settings' : 'Show DNS Settings'}
                </button>
            </div>
            
            {showDetails && (
                <div className="border-t border-border p-6 bg-background/50">
                    <DNSConfig domain={domain} />
                </div>
            )}
        </div>
    );
};

// --- DOMAIN SEARCH & BUY COMPONENT ---
const DomainSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addDomain, hasApiKey, promptForKeySelection } = useEditor();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<{ name: string, price: number, available: boolean }[]>([]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        
        // Simulate AI Suggestion Logic
        if (hasApiKey) {
            try {
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                 const prompt = `Generate 5 creative available domain names for a business related to "${query}". Return ONLY a JSON array of strings. Example: ["mybusiness.com", "getmybusiness.io"]`;
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                 });
                 const suggestions = JSON.parse(response.text) as string[];
                 
                 const mappedResults = suggestions.map(name => ({
                     name,
                     price: Math.floor(Math.random() * 20) + 12, // Random price 12-32
                     available: true
                 }));
                 
                 // Add exact match check simulation
                 const exactMatch = { name: query.includes('.') ? query : `${query}.com`, price: 15, available: Math.random() > 0.3 };
                 setResults([exactMatch, ...mappedResults]);

            } catch (e) {
                console.error("AI Search failed, falling back", e);
                 // Fallback simulation
                setResults([
                    { name: `${query}.com`, price: 15, available: Math.random() > 0.5 },
                    { name: `${query}.io`, price: 45, available: true },
                    { name: `get${query}.com`, price: 12, available: true },
                ]);
            }
        } else {
             // No API key fallback
             setResults([
                { name: `${query}.com`, price: 15, available: Math.random() > 0.5 },
                { name: `${query}.io`, price: 45, available: true },
                { name: `try${query}.com`, price: 12, available: true },
            ]);
        }
        
        setIsSearching(false);
    };

    const handleBuy = async (domainName: string) => {
        // Simulate Purchase Process
        const confirm = window.confirm(`Buy ${domainName} for 1 year? This will be charged to your account.`);
        if (confirm) {
            await addDomain({
                id: `dom_${Date.now()}`,
                name: domainName,
                status: 'active', // Auto-active if bought through us (simulated)
                provider: 'Quimera',
                createdAt: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 31536000000).toISOString() // +1 year
            });
            onClose();
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Find a Domain</h2>
                    <p className="text-sm text-muted-foreground">Search for your perfect web address. Powered by AI.</p>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground"><X size={20}/></button>
            </div>

            <div className="flex gap-2 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18}/>
                    <input 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full bg-secondary/30 border border-border rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="e.g. myawesomebrand"
                    />
                </div>
                <button 
                    onClick={handleSearch}
                    disabled={isSearching || !query}
                    className="bg-primary text-primary-foreground font-bold px-6 rounded-lg hover:opacity-90 transition-all flex items-center disabled:opacity-50"
                >
                    {isSearching ? <Loader2 size={18} className="animate-spin"/> : 'Search'}
                </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {results.map((res, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                        <div>
                            <p className="font-bold text-lg text-foreground">{res.name}</p>
                            {res.available ? (
                                <span className="text-xs text-green-500 font-medium flex items-center"><CheckCircle size={10} className="mr-1"/> Available</span>
                            ) : (
                                <span className="text-xs text-red-500 font-medium flex items-center"><X size={10} className="mr-1"/> Taken</span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-lg">${res.price}<span className="text-xs font-normal text-muted-foreground">/yr</span></span>
                            <button 
                                onClick={() => handleBuy(res.name)}
                                disabled={!res.available}
                                className="bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Buy
                            </button>
                        </div>
                    </div>
                ))}
                {results.length === 0 && !isSearching && (
                    <div className="text-center py-10 text-muted-foreground">
                        Enter a keyword to find available domains.
                    </div>
                )}
            </div>
             <div className="mt-4 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground flex items-center justify-center">
                <Globe size={12} className="mr-1"/> Powered by Google Domains (Simulation)
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const DomainsDashboard: React.FC = () => {
    const { domains, addDomain } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectDomainName, setConnectDomainName] = useState('');

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectDomainName) return;
        
        await addDomain({
            id: `dom_${Date.now()}`,
            name: connectDomainName,
            status: 'pending',
            provider: 'External',
            createdAt: new Date().toISOString()
        });
        setIsConnectModalOpen(false);
        setConnectDomainName('');
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-[65px] px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Menu />
                        </button>
                        <div className="flex items-center gap-2">
                            <Link2 className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground">Domains</h1>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsConnectModalOpen(true)}
                            className="bg-secondary hover:bg-secondary/80 text-foreground font-bold py-2 px-4 rounded-lg transition-all text-sm hidden sm:flex items-center"
                        >
                            <Link2 size={16} className="mr-2" /> Connect Existing
                        </button>
                        <button 
                            onClick={() => setIsBuyModalOpen(true)}
                            className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center text-sm"
                        >
                            <ShoppingCart size={16} className="mr-2" /> Buy Domain
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth bg-secondary/5">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        {domains.length === 0 ? (
                            <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Globe size={40} className="text-muted-foreground opacity-50" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">No Domains Yet</h2>
                                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                    Connect a domain you already own, or purchase a new one to give your projects a professional identity.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button onClick={() => setIsConnectModalOpen(true)} className="px-6 py-3 rounded-xl border border-border bg-background hover:bg-secondary transition-colors font-bold">Connect Existing</button>
                                    <button onClick={() => setIsBuyModalOpen(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-bold">Find a Domain</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {domains.map(domain => (
                                    <DomainCard key={domain.id} domain={domain} />
                                ))}
                            </div>
                        )}

                    </div>
                </main>
                
                {/* Buy Modal */}
                <Modal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} maxWidth="max-w-2xl">
                    <DomainSearch onClose={() => setIsBuyModalOpen(false)} />
                </Modal>

                {/* Connect Modal */}
                <Modal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} maxWidth="max-w-md">
                    <div className="p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-foreground">Connect Existing Domain</h2>
                            <button onClick={() => setIsConnectModalOpen(false)} className="p-1 rounded-full hover:bg-secondary text-muted-foreground"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleConnectSubmit}>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Domain Name</label>
                                <input 
                                    required
                                    autoFocus
                                    value={connectDomainName}
                                    onChange={(e) => setConnectDomainName(e.target.value)}
                                    placeholder="example.com"
                                    className="w-full bg-secondary/30 border border-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium"
                                />
                                <p className="text-xs text-muted-foreground mt-2">Enter the domain you bought from another provider (e.g., GoDaddy).</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsConnectModalOpen(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">Cancel</button>
                                <button type="submit" className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-all">Continue</button>
                            </div>
                        </form>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default DomainsDashboard;

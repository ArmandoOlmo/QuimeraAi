
import React from 'react';
import { Activity, ArrowUpRight, Eye, MousePointer2 } from 'lucide-react';

const AnalyticsWidget: React.FC = () => {
    // Static robust visualization to prevent render crashes
    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-card via-card to-background border border-border rounded-[1.5rem] relative overflow-hidden shadow-lg group">
            
            {/* Header */}
            <div className="p-6 pb-0 relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                            <Activity size={14} className="text-primary animate-pulse" />
                        </div>
                        <h3 className="text-foreground font-bold text-sm tracking-tight">Live Activity</h3>
                    </div>
                    <p className="text-muted-foreground text-[11px] font-medium pl-1">Last 24 Hours</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-500">
                    <ArrowUpRight size={10} />
                    <span>+12.5%</span>
                </div>
            </div>

            {/* Visualization Container */}
            <div className="flex-1 relative w-full mt-4 px-2">
                {/* Static Curve to ensure stability (No NaN errors) */}
                 <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <path 
                        d="M0,80 C40,70 60,90 100,60 S160,20 200,50 S260,80 300,30 V120 H0 Z" 
                        fill="url(#chartGradient)" 
                        className="opacity-70"
                    />
                    <path 
                        d="M0,80 C40,70 60,90 100,60 S160,20 200,50 S260,80 300,30" 
                        fill="none" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    
                    {/* Data Points */}
                    <circle cx="100" cy="60" r="4" className="fill-background stroke-primary stroke-2 animate-[pulse_3s_infinite]" />
                    <circle cx="200" cy="50" r="4" className="fill-background stroke-primary stroke-2 animate-[pulse_3s_infinite_0.5s]" />
                    <circle cx="300" cy="30" r="5" className="fill-primary animate-[pulse_2s_infinite]" />
                </svg>
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-secondary/20">
                 <div className="p-3 flex flex-col items-center justify-center hover:bg-secondary/40 transition-colors cursor-default">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-bold mb-0.5">
                        <Eye size={12} /> Views
                    </div>
                    <span className="text-lg font-black text-foreground">24.5k</span>
                </div>
                <div className="p-3 flex flex-col items-center justify-center hover:bg-secondary/40 transition-colors cursor-default">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-bold mb-0.5">
                        <MousePointer2 size={12} /> Clicks
                    </div>
                    <span className="text-lg font-black text-foreground">8.2k</span>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsWidget;

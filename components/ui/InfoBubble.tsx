
import React, { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface InfoBubbleProps {
  content: string;
  bubbleId: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  defaultExpanded?: boolean;
  inline?: boolean; // New: for header integration
}

const InfoBubble: React.FC<InfoBubbleProps> = ({ 
  content, 
  bubbleId, 
  position = 'bottom-left',
  defaultExpanded = true,
  inline = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isClosed, setIsClosed] = useState(false);

  // Load closed state from localStorage
  useEffect(() => {
    const closedState = localStorage.getItem(`quimera_infobubble_${bubbleId}_closed`);
    if (closedState === 'true') {
      setIsClosed(true);
    }
  }, [bubbleId]);

  const handleClose = () => {
    setIsClosed(true);
    localStorage.setItem(`quimera_infobubble_${bubbleId}_closed`, 'true');
  };

  const handleReopen = () => {
    setIsClosed(false);
    setIsExpanded(true);
    localStorage.setItem(`quimera_infobubble_${bubbleId}_closed`, 'false');
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // INLINE MODE (for header integration)
  if (inline) {
    if (isClosed) {
      return (
        <button
          onClick={handleReopen}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 group"
          title="Show tips"
        >
          <span className="text-base">💡</span>
        </button>
      );
    }

    if (!isExpanded) {
      return (
        <button
          onClick={handleToggleExpand}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
          title="Expand tips"
        >
          <span className="text-base">💡</span>
        </button>
      );
    }

    // Expanded inline (dropdown below header)
    return (
      <div className="relative hidden md:block">
        <button
          onClick={handleToggleExpand}
          className="h-9 w-9 flex items-center justify-center rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
        >
          <span className="text-base">💡</span>
        </button>
        
        {/* Dropdown panel */}
        <div className="absolute top-full right-0 mt-2 z-50 animate-fade-in-up">
          <div className="bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-2xl border-l-4 border-purple-600 p-3 w-72 backdrop-blur-sm">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-yellow-400 rounded p-1">
                <img src={QUIMERA_LOGO} alt="Quimera" className="w-4 h-4 object-contain" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-xs text-purple-900 dark:text-purple-200">💡 Quick Tip</h3>
              </div>

              <button
                onClick={handleClose}
                className="p-1 hover:bg-white/50 dark:hover:bg-gray-700 rounded transition-colors"
                title="Close"
              >
                <X size={12} className="text-purple-700 dark:text-purple-400 hover:text-red-600" />
              </button>
            </div>

            <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed bg-white/60 dark:bg-gray-800/60 rounded p-2 backdrop-blur-sm">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXED MODE (legacy - for non-header placement)
  if (isClosed) {
    return (
      <div 
        className={`fixed z-30 cursor-pointer transition-all duration-300 hover:scale-105 ${getPositionClasses(position, true)}`}
        onClick={handleReopen}
        title="Click to show tips"
      >
        <div className="relative group">
          <div className="bg-gradient-to-br from-purple-600 to-yellow-400 rounded-lg px-3 py-2 shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
            <img 
              src={QUIMERA_LOGO} 
              alt="Quimera Info" 
              className="w-5 h-5 object-contain"
            />
            <span className="text-white font-bold text-xs">💡</span>
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-lg bg-purple-500/30 animate-ping opacity-75"></div>
        </div>
      </div>
    );
  }

  // Minimized state
  if (!isExpanded) {
    return (
      <div 
        className={`fixed z-30 cursor-pointer transition-all duration-300 hover:scale-105 ${getPositionClasses(position, true)}`}
        onClick={handleToggleExpand}
        title="Click to expand"
      >
        <div className="bg-gradient-to-br from-purple-600 to-yellow-400 rounded-lg px-3 py-2 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 relative">
          <img 
            src={QUIMERA_LOGO} 
            alt="Quimera Info" 
            className="w-5 h-5 object-contain"
          />
          <span className="text-white font-bold text-xs">💡 Tips</span>
          <Maximize2 size={12} className="text-white/80" />
        </div>
      </div>
    );
  }

  // Expanded state (card style - different from circular assistant)
  return (
    <div 
      className={`fixed z-30 transition-all duration-300 ${getPositionClasses(position, false)}`}
    >
      <div className="relative animate-fade-in-up">
        {/* Card-style info panel */}
        <div className="bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-xl border-l-4 border-purple-600 p-3 w-72 relative backdrop-blur-sm">
          {/* Header with logo */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-yellow-400 rounded p-1">
              <img 
                src={QUIMERA_LOGO} 
                alt="Quimera" 
                className="w-4 h-4 object-contain"
              />
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1">
                💡 Quick Tip
              </h3>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleToggleExpand}
                className="p-1 hover:bg-white/50 dark:hover:bg-gray-700 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 size={12} className="text-purple-700 dark:text-purple-400" />
              </button>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Close"
              >
                <X size={12} className="text-purple-700 dark:text-purple-400 hover:text-red-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed bg-white/60 dark:bg-gray-800/60 rounded p-2 backdrop-blur-sm">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get position classes
const getPositionClasses = (position: string, isMinimized: boolean) => {
  const spacing = '4';
  
  switch (position) {
    case 'top-left':
      return `top-${spacing} left-${spacing}`;
    case 'top-right':
      return `top-${spacing} right-${spacing}`;
    case 'bottom-left':
      return `bottom-${spacing} left-${spacing}`;
    case 'bottom-right':
    default:
      return `bottom-${spacing} right-${spacing}`;
  }
};

// No tail needed for card-style design (different from speech bubble assistant)

export default InfoBubble;


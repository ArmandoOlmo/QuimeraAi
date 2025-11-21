
import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { Sun, Moon, Circle } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useEditor();

  const toggleTheme = () => {
    if (themeMode === 'light') {
        setThemeMode('dark');
    } else if (themeMode === 'dark') {
        setThemeMode('black');
    } else {
        setThemeMode('light');
    }
  };

  const getIcon = () => {
      switch(themeMode) {
          case 'light': return <Sun className="h-6 w-6" />;
          case 'dark': return <Moon className="h-6 w-6" />;
          case 'black': return <Circle className="h-6 w-6 fill-current" />; // Filled circle for black mode
      }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border"
      title={`Current: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} Mode. Click to cycle.`}
    >
      <span className="sr-only">Toggle theme</span>
      {getIcon()}
    </button>
  );
};

export default ThemeToggle;

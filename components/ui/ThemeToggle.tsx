
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
          case 'light': return <Sun className="w-4 h-4" />;
          case 'dark': return <Moon className="w-4 h-4" />;
          case 'black': return <Circle className="w-4 h-4 fill-current" />; // Filled circle for black mode
      }
  };

  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 flex items-center justify-center rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
      title={`${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} Mode`}
    >
      <span className="sr-only">Toggle theme</span>
      {getIcon()}
    </button>
  );
};

export default ThemeToggle;

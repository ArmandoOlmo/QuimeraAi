import React, { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

const Label: React.FC<{ children: ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

interface AIFormControlProps {
  children: ReactNode;
  label: string;
  onAssistClick: () => void;
}

const AIFormControl: React.FC<AIFormControlProps> = ({ children, label, onAssistClick }) => {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <Label htmlFor={id}>{label}</Label>
        <button
          type="button"
          onClick={onAssistClick}
          className="flex items-center text-xs font-semibold py-1 px-2 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
          title="Generate with AI"
        >
          <Sparkles size={16} className="text-editor-accent" />
          <span className="ml-1">Assist</span>
        </button>
      </div>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { id });
        }
        return child;
      })}
    </div>
  );
};

export default AIFormControl;
import React from 'react';

interface GeneratingStateProps {
    statusText: string;
}

const GeneratingState: React.FC<GeneratingStateProps> = ({ statusText }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center h-full">
            <div className="w-12 h-12 border-4 border-editor-accent border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-2">AI is Building Your Website...</h2>
            <p className="text-editor-text-secondary max-w-sm">This may take a moment. Please don't close this window.</p>
            <div className="mt-6 bg-editor-panel-bg px-4 py-2 rounded-lg w-full max-w-md">
                <p className="text-editor-text-primary animate-pulse">{statusText}</p>
            </div>
        </div>
    );
};

export default GeneratingState;
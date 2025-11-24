/**
 * Quimera AI Chat Widget Embed Script
 * 
 * Usage:
 * <script src="https://quimera.app/widget-embed.js" data-project-id="YOUR_PROJECT_ID"></script>
 * 
 * Or programmatically:
 * <script>
 *   (function() {
 *     var script = document.createElement('script');
 *     script.src = 'https://quimera.app/widget-embed.js';
 *     script.dataset.projectId = 'YOUR_PROJECT_ID';
 *     script.dataset.apiUrl = 'https://quimera.app/api/widget'; // optional
 *     document.body.appendChild(script);
 *   })();
 * </script>
 */

(function() {
    'use strict';

    // Get the current script element
    var currentScript = document.currentScript || (function() {
        var scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();

    // Get configuration from data attributes
    var projectId = currentScript.getAttribute('data-project-id');
    var apiUrl = currentScript.getAttribute('data-api-url') || 'https://quimera.app/api/widget';

    if (!projectId) {
        console.error('[Quimera Widget] Error: data-project-id attribute is required');
        return;
    }

    // Prevent multiple initializations
    if (window.QuimeraWidget && window.QuimeraWidget.initialized) {
        console.warn('[Quimera Widget] Widget already initialized');
        return;
    }

    // Create widget namespace
    window.QuimeraWidget = {
        initialized: true,
        projectId: projectId,
        apiUrl: apiUrl
    };

    console.log('[Quimera Widget] Initializing widget for project:', projectId);

    // Function to load the widget React app
    function loadWidget() {
        // Check if React and ReactDOM are already loaded
        var reactLoaded = typeof window.React !== 'undefined';
        var reactDOMLoaded = typeof window.ReactDOM !== 'undefined';

        if (!reactLoaded || !reactDOMLoaded) {
            console.log('[Quimera Widget] Loading React dependencies...');
            
            // Load React
            var reactScript = document.createElement('script');
            reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
            reactScript.crossOrigin = 'anonymous';
            
            reactScript.onload = function() {
                // Load ReactDOM
                var reactDOMScript = document.createElement('script');
                reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
                reactDOMScript.crossOrigin = 'anonymous';
                
                reactDOMScript.onload = function() {
                    loadWidgetBundle();
                };
                
                reactDOMScript.onerror = function() {
                    console.error('[Quimera Widget] Failed to load ReactDOM');
                };
                
                document.head.appendChild(reactDOMScript);
            };
            
            reactScript.onerror = function() {
                console.error('[Quimera Widget] Failed to load React');
            };
            
            document.head.appendChild(reactScript);
        } else {
            loadWidgetBundle();
        }
    }

    // Function to load the actual widget bundle
    function loadWidgetBundle() {
        console.log('[Quimera Widget] Loading widget bundle...');
        
        // Load widget CSS
        var cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://quimera.app/widget-bundle.css';
        document.head.appendChild(cssLink);
        
        // Load widget JavaScript bundle
        var widgetScript = document.createElement('script');
        widgetScript.src = 'https://quimera.app/widget-bundle.js';
        widgetScript.crossOrigin = 'anonymous';
        
        widgetScript.onload = function() {
            console.log('[Quimera Widget] Widget loaded successfully');
            
            // Create container for widget
            var container = document.createElement('div');
            container.id = 'quimera-chat-widget-root';
            document.body.appendChild(container);
            
            // Initialize widget if the bundle exports an init function
            if (window.QuimeraWidget && typeof window.QuimeraWidget.init === 'function') {
                window.QuimeraWidget.init({
                    projectId: projectId,
                    apiUrl: apiUrl,
                    container: container
                });
            }
        };
        
        widgetScript.onerror = function() {
            console.error('[Quimera Widget] Failed to load widget bundle');
        };
        
        document.head.appendChild(widgetScript);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadWidget);
    } else {
        loadWidget();
    }

    // Expose API for programmatic control
    window.QuimeraWidget.open = function() {
        if (window.QuimeraWidgetInstance) {
            window.QuimeraWidgetInstance.open();
        }
    };

    window.QuimeraWidget.close = function() {
        if (window.QuimeraWidgetInstance) {
            window.QuimeraWidgetInstance.close();
        }
    };

    window.QuimeraWidget.toggle = function() {
        if (window.QuimeraWidgetInstance) {
            window.QuimeraWidgetInstance.toggle();
        }
    };

})();


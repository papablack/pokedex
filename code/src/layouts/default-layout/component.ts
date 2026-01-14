import { RWSViewComponent, RWSView, observable, RWSInject, RWSEvents, attr, ApiService, ApiServiceInstance } from '@rws-framework/client';

import { RouterComponent, _ROUTING_EVENT_NAME, IRoutingEvent } from '@rws-framework/browser-router';
RouterComponent;

import { listenRouter } from './listeners/router';
import { listenNotify } from './listeners/notify';
import { NotifyType } from '@front/types/app.types';
import NotificationService, { NotificationServiceInstance } from '@front/services/notification.service';
import SignalService, { SignalServiceInstance } from '@front/services/signal.service';
import { DebugContainer, IDebugLog } from '@front/components/debug-container/component';

@RWSView('default-layout', { ignorePackaging: true })
class DefaultLayout extends RWSViewComponent {
    @attr frontRoute: string;

    @observable currentPage: string;
    @observable currentUrl: string = '/';
    @observable notifications: NotifyType[] = [];
    @observable showDebugContainer: boolean = false;
    @attr({ mode: 'boolean'}) isElectron: boolean = false;

    // Static instance for global access
    private static instance: DefaultLayout | null = null;

    constructor(
        @RWSInject(NotificationService) private notificationService: NotificationServiceInstance,
        @RWSInject(SignalService) private signalService: SignalServiceInstance
    ) {
        super();
        DefaultLayout.instance = this;
    }

    async connectedCallback(): Promise<void> {
        super.connectedCallback();

        // Detect if running in Electron
        this.isElectron = this.detectElectron();
        
        // Add electron class to body for CSS targeting
        if (this.isElectron) {
            document.body.classList.add('electron-app');
        }

        listenRouter.bind(this)();
        listenNotify.bind(this)(); 
        
        // Listen for debug container show/hide from Electron main process
        if (this.isElectron && (window as any).electronAPI) {
            // Listen for IPC events via preload
            window.addEventListener('show-debug-container', () => {
                this.showDebugContainer = true;
            });
            
            window.addEventListener('hide-debug-container', () => {
                this.showDebugContainer = false;
            });
        }
        
        this.$emit('app-started');
    }
    
    // Static method for global notification access
    static addNotify(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
        if (DefaultLayout.instance) {
            DefaultLayout.instance.addNotificationDirect(message, type, duration);
        } else {
            console.warn('DefaultLayout instance not available');
        }
    }

    // Direct notification method that doesn't go through service
    private addNotificationDirect(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
        const notification: NotifyType = {
            id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message,
            type,
            timestamp: Date.now(),
            duration
        };
        
        this.notifications = [...this.notifications, notification];
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotificationById(notification.id);
            }, duration);
        }
    }

    // Static convenience methods
    static showSuccess(messageKey: string) {
        const message = messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t();
        DefaultLayout.addNotify(message, 'success');
    }
    
    static showError(messageKey: string, error?: any) {
        let message = messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t();
        if (error && typeof error === 'string') {
            message += `: ${error}`;
        }
        DefaultLayout.addNotify(message, 'error', 6000);
    }
    
    static showWarning(messageKey: string) {
        const message = messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t();
        DefaultLayout.addNotify(message, 'warning');
    }
    
    static showInfo(messageKey: string) {
        const message = messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t();
        DefaultLayout.addNotify(message, 'info');
    }

    // Debug logging methods
    static addDebugLog(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', source?: string) {
        DefaultLayout.instance.addDebugLog(message, level, source);
    }
    
    static debugInfo(message: string, source?: string) {
        DefaultLayout.instance.addDebugLog(message, 'info', source);
    }
    
    static debugWarn(message: string, source?: string) {
        DefaultLayout.instance.addDebugLog(message, 'warn', source);
    }
    
    static debugError(message: string, source?: string) {
        DefaultLayout.instance.addDebugLog(message, 'error', source);
    }
    
    static debugLog(message: string, source?: string) {
        DefaultLayout.instance.addDebugLog(message, 'debug', source);
    }

    // Instance debug methods
    addDebugLog(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', source?: string) {
        DebugContainer.add(this.signalService, message, level, source);
    }    

    // Pokemon-specific static methods
    static searchStarted(pokemonName: string) {       
    }
    
    static searchCompleted(pokemonName: string) {
    }
    
    static configurationNeeded() {
        DefaultLayout.addNotify('pokedex.configureApiFirst'.t(), 'warning', 5000);
    }
    
    static invalidInput() {
        DefaultLayout.addNotify('pokedex.enterPokemonName'.t(), 'warning');
    }

    // Instance method to add notification programmatically (for backward compatibility)
    addNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
        this.notificationService.showNotification(message, type, duration);
    }
    
    // Method to remove notification by ID (kept for template compatibility)
    removeNotificationById(id: string) {
        this.notifications = this.notifications.filter(notification => notification.id !== id);
    }
    
    // Method to remove notification by index (kept for template compatibility)
    removeNotificationByIndex(index: number) {
        this.notifications = this.notifications.filter((_, itemIndex) => itemIndex !== index);
    }
    
    // Method to detect if running in Electron
    private detectElectron(): boolean {
        // Check for Electron-specific properties
        const isElectron = !!(window && ((window as any).require || (window as any).electronAPI || 
                 (window as any).process?.type === 'renderer' || 
                 (navigator.userAgent.toLowerCase().indexOf('electron') > -1)));
        
        // Add body class for CSS styling
        if (isElectron) {
            document.body.classList.add('electron-app');
        } else {
            document.body.classList.remove('electron-app');
        }
        
        return isElectron;
    }
    
    // Method to close the Electron app
    closeApp() {
        console.log('Close button clicked, isElectron:', this.isElectron);
        
        // Check if we're in Electron environment
        if (this.isElectron) {
            try {
                // Try different Electron APIs
                if ((window as any).electronAPI && (window as any).electronAPI.closeApp) {
                    (window as any).electronAPI.closeApp();
                } else if ((window as any).require) {
                    const { remote } = (window as any).require('electron');
                    const currentWindow = remote.getCurrentWindow();
                    currentWindow.close();
                } else {
                    // Alternative approach
                    window.close();
                }
            } catch (error) {
                console.error('Failed to close app via Electron API:', error);
                // Fallback to window.close() 
                window.close();
            }
        } else {
            console.log('Not in Electron, using window.close()');
            // Fallback for non-Electron environments
            window.close();
        }
    }
}

DefaultLayout.defineComponent();

// Make DefaultLayout globally accessible for debug logging
if (typeof window !== 'undefined') {
    (window as any).DefaultLayout = DefaultLayout;
}

export { DefaultLayout };
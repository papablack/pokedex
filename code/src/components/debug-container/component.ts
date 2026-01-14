import { RWSViewComponent, RWSView, observable, RWSInject } from '@rws-framework/client';
import SignalService, { SignalServiceInstance } from '@front/services/signal.service';

interface IDebugLog {
    id: string;
    timestamp: number;
    message: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    source?: string;
}

@RWSView('debug-container')
class DebugContainer extends RWSViewComponent {
    @observable isExpanded: boolean = false;
    @observable debugLogs: IDebugLog[] = [];
    @observable isVisible: boolean = false; // Start hidden, show only in dev mode
    @observable isDev: boolean = false;

    // Static instance for global access
    private static instance: DebugContainer | null = null;

    constructor(
        @RWSInject(SignalService) private signalService: SignalServiceInstance
    ) {
        super();
        DebugContainer.instance = this;
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Check if we're in development mode
        this.checkDevMode();
        
        // Subscribe to debug logs signal
        const debugSignal = this.signalService.getSignal<IDebugLog[]>('debug-logs', {
            initialValue: []
        });
        
        debugSignal.value$.subscribe((logs: IDebugLog[]) => {
            this.debugLogs = logs;
        });
        
        // Listen for global debug log events (fallback for when DefaultLayout isn't ready)
        window.addEventListener('add-debug-log', (event: CustomEvent) => {
            const { message, level, source } = event.detail;
            this.addLog(message, level, source);
        });

        // Listen for dev mode changes from Electron
        window.addEventListener('dev-mode-changed', (event: CustomEvent) => {
            this.isDev = event.detail.isDev;
            this.isVisible = this.isDev;
        });

        // Add keyboard shortcut to toggle debug container (Ctrl+Shift+D)
        window.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'D' && this.isDev) {
                event.preventDefault();
                this.toggleVisibility();
            }
        });

        // Add initial log to show container is working (only in dev mode)
        if (this.isDev) {
            setTimeout(() => {
                this.addLog('Debug container initialized', 'info', 'frontend');
            }, 1000);
        }
    }

    private checkDevMode() {
        // Check if we're in Electron and development mode
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            const electronAPI = (window as any).electronAPI;
            if (typeof electronAPI.isDev === 'function') {
                this.isDev = electronAPI.isDev();
            } else {
                this.isDev = electronAPI.isDev || false;
            }
        } else {
            // Fallback for non-Electron environments (web dev)
            this.isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        }
        
        // Only show in dev mode
        this.isVisible = this.isDev;
    }

    // Instance method to add log
    addLog(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', source?: string) {
        DebugContainer.add(this.signalService, message, level, source);
        
        // Auto-scroll to bottom
        this.scrollToBottom();
    }

    static add(signalService: SignalServiceInstance, message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', source?: string){
        const newLog: IDebugLog = {
            id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            message,
            level,
            source
        };
        
        const debugSignal = signalService.getSignal<IDebugLog[]>('debug-logs', {
            initialValue: []
        });
        const currentLogs = debugSignal.getValue() || [];
        const updatedLogs = [...currentLogs, newLog];
        
        // Keep only last 100 logs
        if (updatedLogs.length > 100) {
            updatedLogs.splice(0, updatedLogs.length - 100);
        }
        
        debugSignal.setValue(updatedLogs);
    }

    // Toggle expanded state
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this.scrollToBottom();
        }
    }

    // Toggle visibility
    toggleVisibility() {
        this.isVisible = !this.isVisible;
    }

    // Clear all logs
    clearLogs() {
        const debugSignal = this.signalService.getSignal<IDebugLog[]>('debug-logs', {
            initialValue: []
        });
        debugSignal.setValue([]);
    }

    // Get log level class for styling
    getLogLevelClass(level: string): string {
        return `log-${level}`;
    }

    // Format timestamp
    formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    // Scroll to bottom of logs
    private scrollToBottom() {
        setTimeout(() => {
            const logContent = this.$('.debug-log-content') as HTMLElement;
            if (logContent) {
                logContent.scrollTop = logContent.scrollHeight;
            }
        }, 10);
    }

    // Static method to toggle debug container visibility
    static toggleVisibility() {
        if (DebugContainer.instance) {
            DebugContainer.instance.toggleVisibility();
        }
    }

    // Static method to show debug container
    static show() {
        if (DebugContainer.instance) {
            DebugContainer.instance.isVisible = true;
        }
    }

    // Static method to hide debug container
    static hide() {
        if (DebugContainer.instance) {
            DebugContainer.instance.isVisible = false;
        }
    }
}

DebugContainer.defineComponent();

export { DebugContainer, IDebugLog };
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
    @observable isVisible: boolean = false;

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
        
        // Subscribe to debug logs signal
        const debugSignal = this.signalService.getSignal<IDebugLog[]>('debug-logs', {
            initialValue: []
        });
        
        debugSignal.value$.subscribe((logs: IDebugLog[]) => {
            this.debugLogs = logs;
            // Auto-show container when logs are added
            if (logs.length > 0 && !this.isVisible) {
                this.isVisible = true;
            }
        });
        
        // Listen for global debug log events (fallback for when DefaultLayout isn't ready)
        window.addEventListener('add-debug-log', (event: CustomEvent) => {
            const { message, level, source } = event.detail;
            this.addLog(message, level, source);
        });
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
}

DebugContainer.defineComponent();

export { DebugContainer, IDebugLog };
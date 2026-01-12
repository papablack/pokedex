import { RWSViewComponent, RWSView, observable, RWSInject, RWSEvents, attr, ApiService, ApiServiceInstance } from '@rws-framework/client';

import { RouterComponent, _ROUTING_EVENT_NAME, IRoutingEvent } from '@rws-framework/browser-router';
RouterComponent;

import { listenRouter } from './listeners/router';
import { listenNotify } from './listeners/notify';
import { NotifyType } from '@front/types/app.types';
import NotificationService, { NotificationServiceInstance } from '@front/services/notification.service';

@RWSView('default-layout', { ignorePackaging: true })
class DefaultLayout extends RWSViewComponent {
    @attr frontRoute: string;

    @observable currentPage: string;
    @observable currentUrl: string = '/';
    @observable notifications: NotifyType[] = [];

    // Static instance for global access
    private static instance: DefaultLayout | null = null;

    constructor(
        @RWSInject(NotificationService) private notificationService: NotificationServiceInstance,
    ) {
        super();
        DefaultLayout.instance = this;
    }

    async connectedCallback(): Promise<void> {
        super.connectedCallback();

        listenRouter.bind(this)();
        listenNotify.bind(this)(); 
        
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

    // Pokemon-specific static methods
    static searchStarted(pokemonName: string) {
        const message = 'pokedex.analyzing'.t() + ` ${pokemonName}...`;
        DefaultLayout.addNotify(message, 'info', 2000);
    }
    
    static searchCompleted(pokemonName: string) {
        const message = `✅ ${pokemonName} ${'pokedex.searchComplete'.t() || 'data loaded'}!`;
        DefaultLayout.addNotify(message, 'success', 3000);
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
}

DefaultLayout.defineComponent();

export { DefaultLayout };
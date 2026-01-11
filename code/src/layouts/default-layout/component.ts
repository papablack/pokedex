import { RWSViewComponent, RWSView, observable, RWSInject, RWSEvents, attr, ApiService, ApiServiceInstance } from '@rws-framework/client';

import { RouterComponent, _ROUTING_EVENT_NAME, IRoutingEvent } from '@rws-framework/browser-router';
RouterComponent;

import { listenRouter } from './listeners/router';
import { listenNotify } from './listeners/notify';
import { NotifyType } from '@front/types/app.types';

@RWSView('default-layout', { ignorePackaging: true })
class DefaultLayout extends RWSViewComponent {
    @attr frontRoute: string;

    @observable currentPage: string;
    @observable notifications: NotifyType[] = [];

    async connectedCallback(): Promise<void> {
        super.connectedCallback();

        listenRouter.bind(this)();
        listenNotify.bind(this)();       
    }
    
    // Method to add notification programmatically
    addNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
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
    
    // Method to remove notification by ID
    removeNotificationById(id: string) {
        this.notifications = this.notifications.filter(notification => notification.id !== id);
    }
    
    // Method to remove notification by index
    removeNotificationByIndex(index: number) {
        this.notifications = this.notifications.filter((_, itemIndex) => itemIndex !== index);
    }
}

DefaultLayout.defineComponent();

export { DefaultLayout };
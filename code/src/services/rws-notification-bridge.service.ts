import { NotifyType, appEvents } from '../types/app.types';

/**
 * Service to integrate RWS framework notifications with our layout notification system
 */
export class RWSNotificationBridge {
    private static instance: RWSNotificationBridge;
    
    static getInstance(): RWSNotificationBridge {
        if (!RWSNotificationBridge.instance) {
            RWSNotificationBridge.instance = new RWSNotificationBridge();
        }
        return RWSNotificationBridge.instance;
    }
    
    /**
     * Send notification to the default layout
     */
    notify(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
        const notification: NotifyType = {
            id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message,
            type,
            timestamp: Date.now(),
            duration
        };
        
        // Try to find the layout component and call its method directly
        const layoutElement = document.querySelector('default-layout') as any;
        if (layoutElement && layoutElement.addNotification) {
            layoutElement.addNotification(message, type, duration);
            return;
        }
        
        // Fallback: emit event
        if (layoutElement && layoutElement.$emit) {
            layoutElement.$emit(appEvents.notify, notification);
            return;
        }
        
        // Last resort: use our standalone notification service
        try {
            const { notificationService } = require('./notification.service');
            notificationService.showNotification(message, type, duration);
        } catch (e) {
            console.warn('No notification system available, falling back to console:', message);
            console.log(`[${type.toUpperCase()}]`, message);
        }
    }
    
    /**
     * Remove notification by ID
     */
    removeById(id: string) {
        const layoutElement = document.querySelector('default-layout') as any;
        if (layoutElement && layoutElement.removeNotificationById) {
            layoutElement.removeNotificationById(id);
        } else if (layoutElement && layoutElement.$emit) {
            layoutElement.$emit(appEvents.removeNotifyById, { id });
        }
    }
    
    /**
     * Remove notification by index
     */
    removeByIndex(index: number) {
        const layoutElement = document.querySelector('default-layout') as any;
        if (layoutElement && layoutElement.removeNotificationByIndex) {
            layoutElement.removeNotificationByIndex(index);
        } else if (layoutElement && layoutElement.$emit) {
            layoutElement.$emit(appEvents.removeNotify, { index });
        }
    }
}

// Export singleton instance
export const rwsNotificationBridge = RWSNotificationBridge.getInstance();
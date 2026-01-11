import { rwsNotificationBridge } from './rws-notification-bridge.service';

/**
 * Test service for notification system
 */
export class NotificationTestService {
    
    static testAllNotificationTypes() {
        console.log('Testing notification system...');
        
        // Test success notification
        setTimeout(() => {
            rwsNotificationBridge.notify('✅ Success notification test!', 'success', 3000);
        }, 500);
        
        // Test error notification  
        setTimeout(() => {
            rwsNotificationBridge.notify('❌ Error notification test!', 'error', 4000);
        }, 1500);
        
        // Test warning notification
        setTimeout(() => {
            rwsNotificationBridge.notify('⚠️ Warning notification test!', 'warning', 3500);
        }, 2500);
        
        // Test info notification
        setTimeout(() => {
            rwsNotificationBridge.notify('ℹ️ Info notification test!', 'info', 3000);
        }, 3500);
    }
    
    static testRWSFrameworkNotification() {
        // Test RWS framework notifier integration
        import('@rws-framework/client').then(({ RWSContainer, NotifyService }) => {
            const notifyService = RWSContainer().get(NotifyService);
            
            setTimeout(() => {
                notifyService.notify('🔧 RWS Framework notification test!', 'info');
            }, 5000);
            
            setTimeout(() => {
                notifyService.alert('🚨 RWS Framework alert test!', 'warning');
            }, 6000);
            
        }).catch(console.error);
    }
}

// Auto-export for console testing
(window as any).testNotifications = NotificationTestService.testAllNotificationTypes;
(window as any).testRWSNotifications = NotificationTestService.testRWSFrameworkNotification;
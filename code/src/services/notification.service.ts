import { RWSService } from '@rws-framework/client';
import { DefaultLayout } from '@front/layouts/default-layout/component';

export class NotificationService extends RWSService {
    
    showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 4000) {
        DefaultLayout.addNotify(message, type, duration);
    }

    // Utility methods
    showSuccess(messageKey: string) {
        DefaultLayout.showSuccess(messageKey);
    }
    
    showError(messageKey: string, error?: any) {
        DefaultLayout.showError(messageKey, error);
    }
    
    showWarning(messageKey: string) {
        DefaultLayout.showWarning(messageKey);
    }
    
    showInfo(messageKey: string) {
        DefaultLayout.showInfo(messageKey);
    }
    
    // Pokemon-specific notifications
    searchStarted(pokemonName: string) {
        DefaultLayout.searchStarted(pokemonName);
    }
    
    searchCompleted(pokemonName: string) {
        DefaultLayout.searchCompleted(pokemonName);
    }
    
    configurationNeeded() {
        DefaultLayout.configurationNeeded();
    }
    
    invalidInput() {
        DefaultLayout.invalidInput();
    }
}

// Export both default singleton and instance type for DI
export default NotificationService.getSingleton();
export { NotificationService as NotificationServiceInstance };
import { notificationService } from './notification.service';

export class NotificationUtils {
    static showSuccess(messageKey: string) {
        notificationService.showNotification(messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t(), 'success');
    }
    
    static showError(messageKey: string, error?: any) {
        let message = messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t();
        if (error && typeof error === 'string') {
            message += `: ${error}`;
        }
        notificationService.showNotification(message, 'error', 6000);
    }
    
    static showWarning(messageKey: string) {
        notificationService.showNotification(messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t(), 'warning');
    }
    
    static showInfo(messageKey: string) {
        notificationService.showNotification(messageKey.endsWith('.t()') ? messageKey : `${messageKey}`.t(), 'info');
    }
    
    // Pokemon-specific notifications
    static searchStarted(pokemonName: string) {
        const message = 'pokedex.analyzing'.t() + ` ${pokemonName}...`;
        notificationService.showNotification(message, 'info', 2000);
    }
    
    static searchCompleted(pokemonName: string) {
        const message = `✅ ${pokemonName} ${'pokedex.searchComplete'.t() || 'data loaded'}!`;
        notificationService.showNotification(message, 'success', 3000);
    }
    
    static configurationNeeded() {
        notificationService.showNotification('pokedex.configureApiFirst'.t(), 'warning', 5000);
    }
    
    static invalidInput() {
        notificationService.showNotification('pokedex.enterPokemonName'.t(), 'warning');
    }
}

// Export singleton
export const notify = new NotificationUtils();
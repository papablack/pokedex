export class NotificationService {
    showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${this.getBootstrapType(type)} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.style.animation = 'fadeIn 0.3s';
        toast.innerHTML = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    private getBootstrapType(type: string): string {
        switch (type) {
            case 'error': return 'danger';
            case 'warning': return 'warning';
            case 'success': return 'success';
            default: return 'info';
        }
    }
}

// Singleton instance
export const notificationService = new NotificationService();
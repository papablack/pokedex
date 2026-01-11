export class NotificationService {
    private toastContainer: HTMLElement | null = null;
    private toastId = 0;

    constructor() {
        this.ensureToastContainer();
    }

    private ensureToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'position-fixed top-0 end-0 p-3';
            this.toastContainer.style.zIndex = '9999';
            document.body.appendChild(this.toastContainer);
        }
    }

    showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 4000) {
        this.ensureToastContainer();
        
        const toastId = ++this.toastId;
        const toast = this.createToast(message, type, toastId);
        
        this.toastContainer!.appendChild(toast);
        
        // Trigger show animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto dismiss
        setTimeout(() => {
            this.dismissToast(toast);
        }, duration);
    }

    private createToast(message: string, type: string, id: number): HTMLElement {
        const toast = document.createElement('div');
        const alertType = this.getBootstrapType(type);
        const icon = this.getIcon(type);
        
        toast.className = `toast align-items-center text-bg-${alertType} border-0 notification-toast`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('data-toast-id', id.toString());
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${icon} me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Add click to dismiss
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dismissToast(toast);
            });
        }
        
        return toast;
    }

    private dismissToast(toast: HTMLElement) {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    private getIcon(type: string): string {
        switch (type) {
            case 'success': return 'bi bi-check-circle';
            case 'error': return 'bi bi-exclamation-triangle';
            case 'warning': return 'bi bi-exclamation-triangle';
            default: return 'bi bi-info-circle';
        }
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
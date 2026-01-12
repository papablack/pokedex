export interface NotifyType {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: number;
    duration?: number;
}

export interface AppEvents {
    notify: string;
    removeNotify: string;
    removeNotifyById: string;
}

export const appEvents: AppEvents = {
    notify: 'app.notify',
    removeNotify: 'app.removeNotify', 
    removeNotifyById: 'app.removeNotifyById'
};

export interface AIModelOption {
    value: string;
    label: string;
    free?: boolean;
}
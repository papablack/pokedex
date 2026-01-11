// Event system for Pokedex components

type EventCallback = (data?: any) => void;

class EventEmitter {
    private events: { [key: string]: EventCallback[] } = {};
    private maxListeners = 50;

    on(event: string, callback: EventCallback): this {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        if (this.events[event].length >= this.maxListeners) {
            console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${event}`);
        }
        
        this.events[event].push(callback);
        return this;
    }

    once(event: string, callback: EventCallback): this {
        const onceWrapper = (data?: any) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        return this.on(event, onceWrapper);
    }

    off(event: string, callback?: EventCallback): this {
        if (!this.events[event]) return this;
        
        if (!callback) {
            delete this.events[event];
        } else {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
            if (this.events[event].length === 0) {
                delete this.events[event];
            }
        }
        
        return this;
    }

    emit(event: string, data?: any): this {
        if (this.events[event]) {
            // Create a copy to avoid issues if listeners modify the array
            const listeners = [...this.events[event]];
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            });
        }
        return this;
    }

    listenerCount(event: string): number {
        return this.events[event] ? this.events[event].length : 0;
    }

    removeAllListeners(event?: string): this {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
        return this;
    }
}

// Global event emitter for Pokedex components
export const Events = new EventEmitter();

// Event types for better type safety
export enum PokedexEvents {
    SETTINGS_CHANGED = 'settings-changed',
    SEARCH_START = 'search-start',
    SEARCH_COMPLETE = 'search-complete',
    SEARCH_ERROR = 'search-error',
    NOTIFICATION = 'notification'
}
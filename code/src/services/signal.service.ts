import { RWSService } from '@rws-framework/client';
import { BehaviorSubject, Observable, Subject, Subscription, distinctUntilChanged, filter, map, shareReplay, takeUntil } from 'rxjs';

/**
 * Signal configuration interface
 */
interface ISignalConfig<T> {
    initialValue?: T;
    distinctUntilChanged?: boolean;
    shareReplay?: boolean;
    bufferSize?: number;
}

/**
 * Signal instance interface for better type safety
 */
interface ISignal<T> {
    value$: Observable<T>;
    setValue: (value: T) => void;
    getValue: () => T;
    destroy: () => void;
}

/**
 * SignalService for managing RxJS signals throughout the application
 * Provides a centralized way to create, manage, and clean up reactive signals
 */
class SignalService extends RWSService {
    private signals: Map<string, BehaviorSubject<any>> = new Map();
    private subscriptions: Map<string, Subscription[]> = new Map();
    private destroySubject = new Subject<void>();

    /**
     * Create a new signal with optional configuration
     */
    createSignal<T>(key: string, config: ISignalConfig<T> = {}): ISignal<T> {
        if (this.signals.has(key)) {
            // Return existing signal with the same logic as getSignal
            const existingSubject = this.signals.get(key)!;
            let value$ = existingSubject.asObservable().pipe(
                distinctUntilChanged(),
                shareReplay({ bufferSize: 1, refCount: true }),
                takeUntil(this.destroySubject)
            );

            return {
                value$,
                setValue: (value: T) => {
                    if (!existingSubject.closed) {
                        existingSubject.next(value);
                    }
                },
                getValue: () => existingSubject.value,
                destroy: () => this.destroySignal(key)
            };
        }

        const subject = new BehaviorSubject<T>(config.initialValue as T);
        this.signals.set(key, subject);
        this.subscriptions.set(key, []);

        let value$ = subject.asObservable();

        // Apply configuration options
        if (config.distinctUntilChanged !== false) {
            value$ = value$.pipe(distinctUntilChanged());
        }

        if (config.shareReplay !== false) {
            value$ = value$.pipe(shareReplay({
                bufferSize: config.bufferSize || 1,
                refCount: true
            }));
        }

        // Auto-cleanup on service destroy
        value$ = value$.pipe(takeUntil(this.destroySubject));

        return {
            value$,
            setValue: (value: T) => {
                if (!subject.closed) {
                    subject.next(value);
                }
            },
            getValue: () => subject.value,
            destroy: () => this.destroySignal(key)
        };
    }

    /**
     * Get an existing signal by key, or create it if it doesn't exist
     */
    getSignal<T>(key: string, config: ISignalConfig<T> = {}): ISignal<T> {
        const existingSubject = this.signals.get(key);
        if (existingSubject) {
            let value$ = existingSubject.asObservable().pipe(
                distinctUntilChanged(),
                shareReplay({ bufferSize: 1, refCount: true }),
                takeUntil(this.destroySubject)
            );

            return {
                value$,
                setValue: (value: T) => {
                    if (!existingSubject.closed) {
                        existingSubject.next(value);
                    }
                },
                getValue: () => existingSubject.value,
                destroy: () => this.destroySignal(key)
            };
        }

        // Signal doesn't exist, create it
        return this.createSignal<T>(key, config);
    }

    /**
     * Check if a signal exists
     */
    hasSignal(key: string): boolean {
        return this.signals.has(key);
    }

    /**
     * Set value for an existing signal
     */
    setSignalValue<T>(key: string, value: T): boolean {
        const subject = this.signals.get(key);
        if (subject && !subject.closed) {
            subject.next(value);
            return true;
        }
        return false;
    }

    /**
     * Get current value of a signal
     */
    getSignalValue<T>(key: string): T | undefined {
        const subject = this.signals.get(key);
        return subject ? subject.value : undefined;
    }

    /**
     * Create a computed signal based on other signals
     */
    createComputedSignal<T, R>(
        key: string,
        sourceKeys: string[],
        computeFn: (...values: T[]) => R,
        config: ISignalConfig<R> = {}
    ): ISignal<R> {
        if (this.signals.has(key)) {
            console.warn(`Computed signal already exists: '${key}'. Returning existing signal.`);
            return this.getSignal<R>(key);
        }

        const sourceSignals = sourceKeys.map(sourceKey => {
            const signal = this.getSignal<T>(sourceKey);
            if (!signal) {
                throw new Error(`Source signal not found: '${sourceKey}' for computed signal '${key}'`);
            }
            return signal.value$;
        });

        // Combine all source signals and compute the result
        const computedSubject = new BehaviorSubject<R>(config.initialValue as R);
        this.signals.set(key, computedSubject);
        this.subscriptions.set(key, []);

        // Subscribe to changes in source signals
        const subscription = this.combineLatest(sourceSignals).subscribe(values => {
            try {
                const result = computeFn(...values);
                if (!computedSubject.closed) {
                    computedSubject.next(result);
                }
            } catch (error) {
                console.error(`Computation error in signal '${key}':`, error);
            }
        });

        this.addSubscription(key, subscription);

        let value$ = computedSubject.asObservable();

        if (config.distinctUntilChanged !== false) {
            value$ = value$.pipe(distinctUntilChanged());
        }

        if (config.shareReplay !== false) {
            value$ = value$.pipe(shareReplay({
                bufferSize: config.bufferSize || 1,
                refCount: true
            }));
        }

        value$ = value$.pipe(takeUntil(this.destroySubject));

        return {
            value$,
            setValue: () => {
                console.warn(`Cannot set value on computed signal '${key}'. Computed signals are read-only.`);
            },
            getValue: () => computedSubject.value,
            destroy: () => this.destroySignal(key)
        };
    }

    /**
     * Create a filtered signal that only emits when a condition is met
     */
    createFilteredSignal<T>(
        key: string,
        sourceKey: string,
        filterFn: (value: T) => boolean,
        config: ISignalConfig<T> = {}
    ): ISignal<T> {
        const sourceSignal = this.getSignal<T>(sourceKey);
        if (!sourceSignal) {
            throw new Error(`Source signal not found: '${sourceKey}' for filtered signal '${key}'`);
        }

        const filteredSubject = new BehaviorSubject<T>(config.initialValue as T);
        this.signals.set(key, filteredSubject);
        this.subscriptions.set(key, []);

        const subscription = sourceSignal.value$
            .pipe(filter(filterFn))
            .subscribe(value => {
                if (!filteredSubject.closed) {
                    filteredSubject.next(value);
                }
            });

        this.addSubscription(key, subscription);

        let value$ = filteredSubject.asObservable();

        if (config.distinctUntilChanged !== false) {
            value$ = value$.pipe(distinctUntilChanged());
        }

        if (config.shareReplay !== false) {
            value$ = value$.pipe(shareReplay({
                bufferSize: config.bufferSize || 1,
                refCount: true
            }));
        }

        value$ = value$.pipe(takeUntil(this.destroySubject));

        return {
            value$,
            setValue: (value: T) => {
                // Update the source signal instead
                sourceSignal.setValue(value);
            },
            getValue: () => filteredSubject.value,
            destroy: () => this.destroySignal(key)
        };
    }

    /**
     * Add a subscription to track for a signal
     */
    private addSubscription(key: string, subscription: Subscription): void {
        const subscriptions = this.subscriptions.get(key) || [];
        subscriptions.push(subscription);
        this.subscriptions.set(key, subscriptions);
    }

    /**
     * Simple combineLatest implementation
     */
    private combineLatest<T>(observables: Observable<T>[]): Observable<T[]> {
        return new Observable<T[]>(subscriber => {
            const values: T[] = new Array(observables.length);
            const hasValue: boolean[] = new Array(observables.length).fill(false);
            let completed = 0;

            const subscriptions = observables.map((obs, index) => {
                return obs.subscribe({
                    next: (value) => {
                        values[index] = value;
                        hasValue[index] = true;
                        
                        if (hasValue.every(has => has)) {
                            subscriber.next([...values]);
                        }
                    },
                    error: (error) => subscriber.error(error),
                    complete: () => {
                        completed++;
                        if (completed === observables.length) {
                            subscriber.complete();
                        }
                    }
                });
            });

            return () => {
                subscriptions.forEach(sub => sub.unsubscribe());
            };
        });
    }

    /**
     * Destroy a specific signal and clean up its subscriptions
     */
    destroySignal(key: string): void {
        const subject = this.signals.get(key);
        const subscriptions = this.subscriptions.get(key) || [];

        // Unsubscribe all related subscriptions
        subscriptions.forEach(sub => {
            if (!sub.closed) {
                sub.unsubscribe();
            }
        });

        // Complete and remove the subject
        if (subject && !subject.closed) {
            subject.complete();
        }

        this.signals.delete(key);
        this.subscriptions.delete(key);
    }

    /**
     * Get all signal keys
     */
    getSignalKeys(): string[] {
        return Array.from(this.signals.keys());
    }

    /**
     * Clear all signals and subscriptions
     */
    clearAllSignals(): void {
        this.signals.forEach((subject, key) => {
            this.destroySignal(key);
        });
        this.signals.clear();
        this.subscriptions.clear();
    }

    /**
     * Get signal status information for debugging
     */
    getSignalStatus(key: string): { exists: boolean; closed: boolean; hasSubscriptions: boolean; subscriptionCount: number } | null {
        if (!this.signals.has(key)) {
            return null;
        }

        const subject = this.signals.get(key)!;
        const subscriptions = this.subscriptions.get(key) || [];

        return {
            exists: true,
            closed: subject.closed,
            hasSubscriptions: subscriptions.length > 0,
            subscriptionCount: subscriptions.length
        };
    }

    /**
     * Service cleanup - called when service is destroyed
     */
    destroy(): void {
        this.destroySubject.next();
        this.destroySubject.complete();
        this.clearAllSignals();
    }
}

export default SignalService.getSingleton();
export { SignalService as SignalServiceInstance, ISignal, ISignalConfig };
import { RWSService, RWSInject } from '@rws-framework/client';
import { IPokedexSettings } from '../types/pokedex.types';
import SignalService, { SignalServiceInstance } from './signal.service';

const FREE_KEY = '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';
const FREE_MODEL = 'openai/gpt-4o-mini';

const defaultModel = ''

export class PokedexSettingsService extends RWSService {
    private readonly STORAGE_KEY = 'pokedex_settings';
    private readonly SETTINGS_SIGNAL_KEY = 'pokedex_settings';
    private defaultSettings: IPokedexSettings = {
        apiKey: '',
        model: 'openai/gpt-4o-mini',
        language: 'pl',
        temperature: 0.7,
        streaming: true
    };

    constructor(
        @SignalService private signalService: SignalServiceInstance
    ) {
        super();
        
        // Initialize settings signal with current settings
        const currentSettings = this.getSettings();
        
        try {
            this.signalService.createSignal(this.SETTINGS_SIGNAL_KEY, {
                initialValue: currentSettings
            });
        } catch (e) {
            console.error('Failed to create signal:', e);
        }
    }

    getSettings(): IPokedexSettings {
        
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            
            if (saved && saved !== 'undefined' && saved !== 'null') {
                const parsed = JSON.parse(saved);
                
                const result: IPokedexSettings = { ...this.defaultSettings, ...parsed };

                return result;
            }
        } catch (e) {
            console.error('Error loading settings:', e);
            console.error('pokedex.settingsLoadError'.t(), e);
        }
        
        return { ...this.defaultSettings };
    }

    static isFreeMode(settings: IPokedexSettings) : boolean {
        if(!settings.apiKey) {
            return true;
        }

        return false;
    }

    static getFreeModel(): string {
        return FREE_MODEL;
    }

    static getFreeKey(): string {
        return FREE_KEY;
    }

    saveSettings(settings: IPokedexSettings): void {
        
        try {
            const settingsJson = JSON.stringify(settings);
            
            localStorage.setItem(this.STORAGE_KEY, settingsJson);
            
            // Emit settings change signal
            
            if (this.signalService) {
                this.signalService.setSignalValue(this.SETTINGS_SIGNAL_KEY, settings);
            } else {
                console.error('SignalService not available!');
            }
            
        } catch (e) {
            console.error('Error saving settings:', e);
            console.error('pokedex.settingsSaveError'.t(), e);
            throw new Error('pokedex.settingsSaveError'.t());
        }
    }

    clearSettings(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            // Emit settings change signal with default settings
            const defaultSettings = { ...this.defaultSettings };
            this.signalService.setSignalValue(this.SETTINGS_SIGNAL_KEY, defaultSettings);
        } catch (e) {
            console.error('pokedex.settingsClearError'.t(), e);
        }
    }

    isConfigured(): boolean {
        const settings = this.getSettings();
        const configured = !!(settings.apiKey && settings.apiKey.trim());
        return configured;
    }

    /**
     * Get the settings signal for reactive subscriptions
     */
    getSettingsSignal() {
        if (this.signalService) {
            const signal = this.signalService.getSignal<IPokedexSettings>(this.SETTINGS_SIGNAL_KEY);
            return signal;
        } else {
            console.error('SignalService not available in getSettingsSignal!');
            return null;
        }
    }
}

// Export both default singleton and instance type for DI
export default PokedexSettingsService.getSingleton();
export { PokedexSettingsService as PokedexSettingsServiceInstance };
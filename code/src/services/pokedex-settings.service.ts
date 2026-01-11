import { RWSService, RWSInject } from '@rws-framework/client';
import { IPokedexSettings } from '../types/pokedex.types';
import SignalService, { SignalServiceInstance } from './signal.service';

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
        console.log('PokedexSettingsService constructor - signalService:', this.signalService);
        // Initialize settings signal with current settings
        const currentSettings = this.getSettings();
        console.log('Creating signal with initial settings:', currentSettings);
        this.signalService.createSignal(this.SETTINGS_SIGNAL_KEY, {
            initialValue: currentSettings
        });
        console.log('Signal created successfully');
    }

    getSettings(): IPokedexSettings {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            console.log('Loading settings from localStorage:', saved);
            if (saved && saved !== 'undefined' && saved !== 'null') {
                const parsed = JSON.parse(saved);
                const result = { ...this.defaultSettings, ...parsed };
                console.log('Loaded settings:', result);
                return result;
            }
        } catch (e) {
            console.error('pokedex.settingsLoadError'.t(), e);
        }
        console.log('Returning default settings:', this.defaultSettings);
        return { ...this.defaultSettings };
    }

    saveSettings(settings: IPokedexSettings): void {
        try {
            console.log('Saving settings to localStorage:', settings);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            console.log('Settings saved, now emitting signal');
            // Emit settings change signal
            this.signalService.setSignalValue(this.SETTINGS_SIGNAL_KEY, settings);
            console.log('Signal emitted successfully');
        } catch (e) {
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
        return !!settings.apiKey.trim();
    }

    /**
     * Get the settings signal for reactive subscriptions
     */
    getSettingsSignal() {
        return this.signalService.getSignal<IPokedexSettings>(this.SETTINGS_SIGNAL_KEY);
    }
}

// Export both default singleton and instance type for DI
export default PokedexSettingsService.getSingleton();
export { PokedexSettingsService as PokedexSettingsServiceInstance };
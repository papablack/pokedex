import { RWSService, RWSInject } from '@rws-framework/client';
import { IPokedexSettings } from '../types/pokedex.types';
import SignalService, { SignalServiceInstance } from './signal.service';
import StorageService, { StorageServiceInstance } from './storage.service';
import { AIModelOption } from '@front/types/app.types';

const FREE_KEY = 'c2stb3ItdjEtMTEzOWFkNDVlYmU2NDY1NDEwMDY2MTdlZTcxYmE5MjA5YjlmYzMxNjNlNDNhNjljOTZkMjgzNmIxZDBjM2M3MQoK';
//const FREE_MODEL: AIModelOption = { value: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B (Free)', free: true };
const FREE_MODEL: AIModelOption = { value: 'allenai/molmo-2-8b:free', label: 'Molmo2 (Free)', free: true };
const QUERY_MODEL: AIModelOption = { value: 'mistralai/devstral-2512:free', label: 'Devstral 2 (Free)', free: true };
//allenai/molmo-2-8b:free
export class PokedexSettingsService extends RWSService {
    private readonly STORAGE_KEY = 'pokedex_settings';
    private readonly SETTINGS_SIGNAL_KEY = 'pokedex_settings';
    private defaultSettings: IPokedexSettings = {
        apiKey: '',
        model: FREE_MODEL.value,
        language: 'pl',
        temperature: 0.7,
        streaming: true
    };

    constructor(
        @SignalService private signalService: SignalServiceInstance,
        @StorageService private storageService: StorageServiceInstance
    ) {
        super();
        
        // Initialize settings signal and load settings asynchronously
        this.initializeSettings();
    }

    private async initializeSettings(): Promise<void> {
        try {
            const currentSettings = await this.getSettings();
            
            this.signalService.createSignal(this.SETTINGS_SIGNAL_KEY, {
                initialValue: currentSettings
            });
        } catch (e) {
            console.error('Failed to initialize settings:', e);
        }
    }

    async getSettings(): Promise<IPokedexSettings> {
        
        try {
            const saved = await this.storageService.get(this.STORAGE_KEY);
            
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

    static getFreeModel(): AIModelOption {
        return FREE_MODEL;
    }

    static getQueryModel(): AIModelOption {
        return QUERY_MODEL;
    }

    /**
     * Synchronous version of getSettings for backward compatibility
     * Note: This will return default settings if storage is not immediately available (e.g., Electron)
     */
    getSettingsSync(): IPokedexSettings {
        try {
            if (this.storageService.getStorageType() === 'localStorage') {
                const saved = this.storageService.getSync(this.STORAGE_KEY);
                
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    const parsed = JSON.parse(saved);
                    return { ...this.defaultSettings, ...parsed };
                }
            }
        } catch (e) {
            console.warn('Error loading settings synchronously, returning defaults:', e);
        }

        return { ...this.defaultSettings };
    }

    /**
     * Get the settings signal for reactive updates
     */
    getSettingsSignal() {
        return this.signalService.getSignal(this.SETTINGS_SIGNAL_KEY);
    }

    static getFreeKey(): string {
        return atob(FREE_KEY).trim();
    }

    async saveSettings(settings: IPokedexSettings): Promise<void> {
        try {
            const settingsJson = JSON.stringify(settings);
            
            await this.storageService.set(this.STORAGE_KEY, settingsJson);
            
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

    async clearSettings(): Promise<void> {
        try {
            await this.storageService.remove(this.STORAGE_KEY);
            // Emit settings change signal with default settings
            const defaultSettings = { ...this.defaultSettings };
            this.signalService.setSignalValue(this.SETTINGS_SIGNAL_KEY, defaultSettings);
        } catch (e) {
            console.error('pokedex.settingsClearError'.t(), e);
        }
    }

    async isConfigured(): Promise<boolean> {
        const settings = await this.getSettings();
        const configured = !!(settings.apiKey && settings.apiKey.trim());
        return configured;
    }
}

// Export both default singleton and instance type for DI
export default PokedexSettingsService.getSingleton();
export { PokedexSettingsService as PokedexSettingsServiceInstance };
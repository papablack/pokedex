import { IPokedexSettings } from '../types/pokedex.types';

export class PokedexSettingsService {
    private readonly STORAGE_KEY = 'pokedex_settings';
    private defaultSettings: IPokedexSettings = {
        apiKey: '',
        model: 'openai/gpt-4o-mini',
        language: 'pl',
        temperature: 0.7,
        streaming: true
    };

    getSettings(): IPokedexSettings {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return { ...this.defaultSettings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('pokedex.settingsLoadError'.t(), e);
        }
        return { ...this.defaultSettings };
    }

    saveSettings(settings: IPokedexSettings): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('pokedex.settingsSaveError'.t(), e);
            throw new Error('pokedex.settingsSaveError'.t());
        }
    }

    clearSettings(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.error('pokedex.settingsClearError'.t(), e);
        }
    }

    isConfigured(): boolean {
        const settings = this.getSettings();
        return !!settings.apiKey.trim();
    }
}
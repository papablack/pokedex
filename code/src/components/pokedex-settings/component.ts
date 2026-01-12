import { RWSViewComponent, RWSView, RWSInject, observable } from '@rws-framework/client';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '../../services/pokedex-settings.service';
import SignalService, { SignalServiceInstance } from '../../services/signal.service';
import storageServiceInstance, { StorageServiceInstance } from '../../services/storage.service';
import { IPokedexSettings } from '../../types/pokedex.types';
import { getCurrentLanguage, langKey } from '../../translations/trans';
import { AIModelOption } from '@front/types/app.types';
import { setLanguage } from '@front/application/globals/translations';

const availableModels: AIModelOption[] = [
    { value: PokedexSettingsServiceInstance.getFreeModel().value, label: PokedexSettingsServiceInstance.getFreeModel().label, free: true },
    { value: "openai/gpt-5.2-chat", label: "GPT-5.2 Chat" },
    { value: "anthropic/claude-4.5-sonnet", label: "Claude 4.5 Sonnet" },
    { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" }
];

@RWSView('pokedex-settings')
export class PokedexSettings extends RWSViewComponent {
    @observable settings: IPokedexSettings = {
        apiKey: '',
        model: PokedexSettingsServiceInstance.getFreeModel().value,
        language: 'pl',
        temperature: 0.7,
        streaming: true
    };

    @observable modelsList: AIModelOption[] = availableModels;
    @observable tempSettings: IPokedexSettings;
    @observable showApiKey: boolean = false;

    constructor(
        @RWSInject(PokedexSettingsService) private settingsService: PokedexSettingsServiceInstance,
        @RWSInject(SignalService) private signalService: SignalServiceInstance,
        @RWSInject(storageServiceInstance) private storageService: StorageServiceInstance
    ) {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Load settings and ensure free model is up to date
        this.settings = await this.settingsService.getSettings();
        
        // If we're in free mode, make sure we're using the current free model
        if (PokedexSettingsServiceInstance.isFreeMode(this.settings)) {
            const currentFreeModel = PokedexSettingsServiceInstance.getFreeModel();
            if (this.settings.model !== currentFreeModel.value) {
                this.settings = {
                    ...this.settings,
                    model: currentFreeModel.value
                };
            }
        }
        
        // Subscribe to settings changes
        const settingsSignal = this.settingsService.getSettingsSignal();
        
        if (settingsSignal) {
            settingsSignal.value$.subscribe((newSettings: IPokedexSettings) => {
                this.settings = newSettings;
                // Ensure free model is current when settings change
                if (PokedexSettingsServiceInstance.isFreeMode(this.settings)) {
                    const currentFreeModel = PokedexSettingsServiceInstance.getFreeModel();
                    if (this.settings.model !== currentFreeModel.value) {
                        this.settings = {
                            ...this.settings,
                            model: currentFreeModel.value
                        };
                    }
                }
                this.resetTempSettings();
            });
        }
        
        this.resetTempSettings();
    }

    settingsChanged() {
        this.resetTempSettings();
    }

    private resetTempSettings() {
        this.tempSettings = { ...this.settings };
    }

    toggleApiKeyVisibility() {
        this.showApiKey = !this.showApiKey;
    }

    updateTempSetting(key: keyof IPokedexSettings, value: any) {
        this.tempSettings = {
            ...this.tempSettings,
            [key]: value
        };
    }

    async saveSettings() {
        const currentLanguage = getCurrentLanguage();
        const newLanguage = this.tempSettings.language;
        
        // Check if language changed
        if (currentLanguage !== newLanguage) {
            // Update global language setting
            await this.storageService.set(langKey, newLanguage);
            setLanguage(newLanguage);
            
            // Emit settings save event
            this.$emit('settings-save', this.tempSettings);
            
            // Reload the window to apply language changes
            window.location.reload();
        } else {
            // Just save settings without reload if language didn't change
            this.$emit('settings-save', this.tempSettings);
        }
    }

    clearSettings() {
        if (confirm('pokedex.confirmClearSettings'.t())) {
            this.$emit('settings-clear');
        }
    }

    get tempValue(): string {
        return this.tempSettings?.temperature?.toString() || '0.7';
    }

    get hasCustomApiKey(): boolean {
        return !!(this.tempSettings?.apiKey && this.tempSettings.apiKey.trim());
    }
}

PokedexSettings.defineComponent();

import { RWSViewComponent, RWSView, RWSInject, observable } from '@rws-framework/client';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '../../services/pokedex-settings.service';
import SignalService, { SignalServiceInstance } from '../../services/signal.service';
import { IPokedexSettings } from '../../types/pokedex.types';
import { getCurrentLanguage, langKey } from '../../translations/trans';

@RWSView('pokedex-settings')
export class PokedexSettings extends RWSViewComponent {
    @observable settings: IPokedexSettings = {
        apiKey: '',
        model: 'openai/gpt-5.2-chat',
        language: 'pl',
        temperature: 0.7,
        streaming: true
    };
    @observable tempSettings: IPokedexSettings;
    @observable showApiKey: boolean = false;

    constructor(
        @RWSInject(PokedexSettingsService) private settingsService: PokedexSettingsServiceInstance,
        @RWSInject(SignalService) private signalService: SignalServiceInstance
    ) {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Subscribe to settings changes
        const settingsSignal = this.settingsService.getSettingsSignal();
        
        if (settingsSignal) {
            settingsSignal.value$.subscribe(newSettings => {
                this.settings = newSettings;
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

    saveSettings() {
        const currentLanguage = getCurrentLanguage();
        const newLanguage = this.tempSettings.language;
        
        // Check if language changed
        if (currentLanguage !== newLanguage) {
            // Update global language setting
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(langKey, newLanguage);
            }
            
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
}

PokedexSettings.defineComponent();

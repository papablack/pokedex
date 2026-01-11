import { RWSViewComponent, RWSView, RWSInject, observable } from '@rws-framework/client';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '../../services/pokedex-settings.service';
import SignalService, { SignalServiceInstance } from '../../services/signal.service';
import { IPokedexSettings } from '../../types/pokedex.types';

@RWSView('pokedex-settings')
export class PokedexSettings extends RWSViewComponent {
    @observable settings: IPokedexSettings = {
        apiKey: '',
        model: 'openai/gpt-4o-mini',
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
        this.$emit('settings-save', this.tempSettings);
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

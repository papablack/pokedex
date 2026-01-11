import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';
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

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
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

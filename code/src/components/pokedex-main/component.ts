import { RWSViewComponent, RWSView, observable, attr } from '@rws-framework/client';
import { PokedexAiService } from '../../services/pokedex-ai.service';
import { PokedexSettingsService } from '../../services/pokedex-settings.service';
import { notificationService } from '../../services/notification.service';
import { NotificationUtils } from '../../services/notification-utils.service';
import { Events, PokedexEvents } from '../../event/events';
import { IPokedexSettings } from '../../types/pokedex.types';

@RWSView('pokedex-main')
export class PokedexMain extends RWSViewComponent {
    @observable settings: IPokedexSettings;
    @observable query: string = '';
    @observable output: string = '';
    @observable isGenerating: boolean = false;
    @observable showSettings: boolean = false;

    private aiService: PokedexAiService;
    private settingsService: PokedexSettingsService;

    constructor() {
        super();
        this.settingsService = new PokedexSettingsService();
        this.loadSettings();
        this.aiService = new PokedexAiService(this.settings);
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Test notification system in development
        if (process.env.NODE_ENV === 'development') {
            // Import test service for console access
            import('../../services/notification-test.service');
            
            // Test RWS notification integration after component is ready
            setTimeout(() => {
                console.log('🔔 Notification system ready! Try: testNotifications() or testRWSNotifications()');
            }, 1000);
        }
    }

    private loadSettings() {
        this.settings = this.settingsService.getSettings();
    }

    toggleSettings() {
        this.showSettings = !this.showSettings;
    }

    saveSettings(newSettings: IPokedexSettings) {
        this.settings = newSettings;
        this.settingsService.saveSettings(newSettings);
        this.aiService.updateSettings(newSettings);
        this.showSettings = false;
        
        // Emit settings changed event
        Events.emit(PokedexEvents.SETTINGS_CHANGED, newSettings);
        
        NotificationUtils.showSuccess('pokedex.settingsSaved');
    }

    clearSettings() {
        this.settingsService.clearSettings();
        this.loadSettings();
        this.aiService.updateSettings(this.settings);
        NotificationUtils.showWarning('pokedex.settingsCleared');
    }

    async searchPokemon(searchQuery?: string) {
        const queryToUse = searchQuery || this.query;
        
        if (!queryToUse?.trim()) {
            NotificationUtils.invalidInput();
            return;
        }

        if (!this.settingsService.isConfigured()) {
            this.showSettings = true;
            NotificationUtils.configurationNeeded();
            return;
        }

        if (this.isGenerating) return;

        this.isGenerating = true;
        this.output = '';
        this.query = queryToUse;
        
        // Emit search start event and show notification
        Events.emit(PokedexEvents.SEARCH_START, { query: queryToUse });
        NotificationUtils.searchStarted(queryToUse);

        try {
            if (this.settings.streaming) {
                await this.streamResponse(queryToUse);
            } else {
                await this.generateResponse(queryToUse);
            }
            
            // Emit search complete event and show notification
            Events.emit(PokedexEvents.SEARCH_COMPLETE, { query: queryToUse, output: this.output });
            NotificationUtils.searchCompleted(queryToUse);
            
        } catch (error) {
            console.error('pokedex.searchError'.t(), error);
            this.output = `<div class=\"text-danger\">
                <strong>❌ ${'pokedex.error'.t()}:</strong> ${error.message}
                <br><br>
                <small>${'pokedex.checkApiKey'.t()}</small>
            </div>`;
            
            // Emit search error event
            Events.emit(PokedexEvents.SEARCH_ERROR, { query: queryToUse, error: error.message });
            NotificationUtils.showError('pokedex.searchError', error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    private async generateResponse(query: string) {
        const response = await this.aiService.generateResponse(query);
        this.output = this.formatPokemonText(response);
    }

    private async streamResponse(query: string) {
        let fullText = '';
        
        for await (const chunk of this.aiService.streamResponse(query)) {
            fullText += chunk;
            this.output = this.formatPokemonText(fullText) + '<span class=\"typing-cursor\"></span>';
        }
        
        // Remove cursor after completion
        this.output = this.formatPokemonText(fullText);
    }

    quickSearch(pokemonName: string) {
        this.searchPokemon(pokemonName);
    }

    private formatPokemonText(text: string): string {
        return text
            // Headers
            .replace(/^### (.+)$/gm, '<strong style=\"color:#d63031;font-size:16px;\">$1</strong>')
            .replace(/^## (.+)$/gm, '<strong style=\"color:#d63031;font-size:18px;\">$1</strong>')
            .replace(/^# (.+)$/gm, '<strong style=\"color:#d63031;font-size:20px;\">$1</strong>')
            // Bold
            .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
            // New lines
            .replace(/\\n/g, '<br>')
            // Horizontal lines
            .replace(/---/g, '<hr style=\"border-color:#2d3436;margin:10px 0;\">')
            // Colorful Pokemon types
            .replace(/(Ogień|Fire)/gi, '<span style=\"background:#ff7675;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Woda|Water)/gi, '<span style=\"background:#74b9ff;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Trawa|Grass)/gi, '<span style=\"background:#55efc4;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Elektryczny|Electric)/gi, '<span style=\"background:#ffeaa7;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Psychiczny|Psychic)/gi, '<span style=\"background:#fd79a8;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Latający|Flying)/gi, '<span style=\"background:#a29bfe;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Ziemia|Ground)/gi, '<span style=\"background:#dfe6e9;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Skała|Rock)/gi, '<span style=\"background:#b2bec3;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Duch|Ghost)/gi, '<span style=\"background:#6c5ce7;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Smok|Dragon)/gi, '<span style=\"background:#0984e3;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Ciemność|Dark)/gi, '<span style=\"background:#2d3436;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Stal|Steel)/gi, '<span style=\"background:#636e72;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Wróżka|Fairy)/gi, '<span style=\"background:#fab1a0;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Lód|Ice)/gi, '<span style=\"background:#81ecec;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Walka|Fighting)/gi, '<span style=\"background:#e17055;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Trucizna|Poison)/gi, '<span style=\"background:#a55eea;color:white;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Robak|Bug)/gi, '<span style=\"background:#badc58;padding:1px 5px;border-radius:3px;\">$1</span>')
            .replace(/(Normalny|Normal)/gi, '<span style=\"background:#dfe6e9;padding:1px 5px;border-radius:3px;\">$1</span>');
    }

    get isConnected(): boolean {
        return this.settingsService.isConfigured();
    }

    // Event handlers for sub-components
    handleToggleSettings() {
        this.toggleSettings();
    }

    handleSearch(event: CustomEvent) {
        this.searchPokemon(event.detail);
    }

    handleSettingsSave(event: CustomEvent) {
        this.saveSettings(event.detail);
    }

    handleSettingsClear() {
        this.clearSettings();
    }

    handleSettingsClose() {
        this.showSettings = false;
    }
}

PokedexMain.defineComponent();
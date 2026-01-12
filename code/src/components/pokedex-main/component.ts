import { RWSViewComponent, RWSView, RWSInject, observable, attr } from '@rws-framework/client';
import PokedexAiService, { PokedexAiServiceInstance } from '../../services/pokedex-ai.service';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '../../services/pokedex-settings.service';
import NotificationService, { NotificationServiceInstance } from '../../services/notification.service';
import SignalService, { SignalServiceInstance } from '../../services/signal.service';
import PokemonDataService, { PokemonDataServiceInstance } from '../../services/pokemon-data.service';
import { Events, PokedexEvents } from '../../event/events';
import { IPokedexSettings, IPokedexResponse } from '../../types/pokedex.types';

@RWSView('pokedex-main')
export class PokedexMain extends RWSViewComponent {
    @observable settings: IPokedexSettings;
    @observable query: string = '';
    @observable output: string = '';
    @observable pokemonDataOutput: string = '';
    @observable aiOutput: string = '';
    @observable isGenerating: boolean = false;
    @observable showSettings: boolean = false;
    @observable contentReady: boolean = false;
    @observable rightWingVisible: boolean = false;
    @observable pokemonData: any = null;
    @observable activeRightTab: string = 'data';

    constructor(
        @RWSInject(PokedexAiService) private aiService: PokedexAiServiceInstance,
        @RWSInject(PokedexSettingsService) private settingsService: PokedexSettingsServiceInstance,
        @RWSInject(NotificationService) private notificationService: NotificationServiceInstance,
        @RWSInject(SignalService) private signalService: SignalServiceInstance,
        @RWSInject(PokemonDataService) private pokemonDataService: PokemonDataServiceInstance
    ) {
        super();        
    }

    async connectedCallback() {
        super.connectedCallback();
        
        this.loadSettings();
        this.aiService.setSettings(this.settings);   
        
        // Subscribe to settings changes
        const settingsSignal = this.settingsService.getSettingsSignal();
        settingsSignal.value$.subscribe(newSettings => {
            this.settings = newSettings;
            this.aiService.setSettings(newSettings);
        });
        
        this.on('rws_modal:settings:close', () => {
            this.showSettings = false;
        });
    }

    switchRightTab(tab: string) {
        this.activeRightTab = tab;
    }

    toggleRightWing() {
        this.rightWingVisible = !this.rightWingVisible;
    }

    pokemonDataChanged(oldValue: any, newValue: any) {
        // Automatically open right wing when Pokemon data is available
        if (newValue && !this.rightWingVisible) {
            this.rightWingVisible = true;
        }
        // Close right wing when Pokemon data is cleared
        else if (!newValue && this.rightWingVisible) {
            this.rightWingVisible = false;
        }
    }

    private loadSettings() {
        this.settings = this.settingsService.getSettings();
    }

    toggleSettings() {
        this.showSettings = !this.showSettings;
    }

    saveSettings(newSettings: IPokedexSettings) {
        this.settingsService.saveSettings(newSettings);
        this.showSettings = false;
        
        // Emit settings changed event
        Events.emit(PokedexEvents.SETTINGS_CHANGED, newSettings);
        
        this.notificationService.showSuccess('pokedex.settingsSaved');
    }

    clearSettings() {
        this.settingsService.clearSettings();
        this.notificationService.showWarning('pokedex.settingsCleared');
    }

    async searchPokemon(searchQuery?: string) {
        const queryToUse = searchQuery || this.query;
        
        if (!queryToUse?.trim()) {
            this.notificationService.invalidInput();
            return;
        }

        // Check if we're in free mode (using default free key) - allow operation
        const currentSettings = this.settingsService.getSettings();
        const isFreeMode = PokedexSettingsServiceInstance.isFreeMode(currentSettings);
        
        if (!isFreeMode && !this.settingsService.isConfigured()) {
            this.showSettings = true;
            this.notificationService.configurationNeeded();
            return;
        }

        if (this.isGenerating) return;

        this.isGenerating = true;
        this.contentReady = false;
        this.output = '';
        this.pokemonDataOutput = '';
        this.aiOutput = '';
        this.pokemonData = null; // Clear any previous Pokemon data immediately
        this.query = queryToUse;
        
        // Emit search start event and show notification
        Events.emit(PokedexEvents.SEARCH_START, { query: queryToUse });
        this.notificationService.searchStarted(queryToUse);

        try {
            if (this.settings.streaming) {
                await this.streamResponse(queryToUse);
            } else {
                await this.generateResponse(queryToUse);
            }
            
            // Emit search complete event and show notification
            Events.emit(PokedexEvents.SEARCH_COMPLETE, { query: queryToUse, output: this.output });
            this.notificationService.searchCompleted(queryToUse);
            
        } catch (error) {
            console.error('pokedex.searchError'.t(), error);
            
            // Check if this is a rate limit error
            if (error.message && error.message.includes('pokedx.rateLimitWait'.t())) {
                this.output = `<div class="ai-fallback-message">
                    <h3 class="ai-fallback-title">⚠️ ${'pokedx.rateLimitTitle'.t()}</h3>
                    <p class="ai-fallback-text">${'pokedx.rateLimitWait'.t()}</p>
                    <p class="ai-fallback-text"><small>${'pokedx.rateLimitHelp'.t()}</small></p>
                </div>`;
            } else {
                this.output = `<div class=\"text-danger\">
                    <strong>❌ ${'pokedex.error'.t()}:</strong> ${error.message}
                    <br><br>
                    <small>${'pokedex.checkApiKey'.t()}</small>
                </div>`;
            }
            
            // Emit search error event
            Events.emit(PokedexEvents.SEARCH_ERROR, { query: queryToUse, error: error.message });
            this.notificationService.showError('pokedex.searchError', error.message);
        } finally {
            // Only stop loading if not streaming (streaming handles this internally)
            if (!this.settings.streaming) {
                this.isGenerating = false;
            }
        }
    }

    private async generateResponse(query: string) {
        const response: IPokedexResponse = await this.aiService.generateResponse(query);
        
        // Handle Pokemon data if found
        if (response.pokemonData) {
            this.pokemonData = response.pokemonData;
            this.pokemonDataOutput = this.pokemonDataService.formatPokemonDataToHTML(response.pokemonData, this.settings.language);
        } else {
            this.pokemonData = null;
            this.pokemonDataOutput = '';
        }
        
        // Handle AI response - ensure it only goes to main screen and not Pokemon data
        if (response.aiResponse) {
            this.aiOutput = response.aiResponse;
        } else {
            this.aiOutput = '';
        }
        
        // Update output for main screen (AI synopsis only) - never Pokemon data
        this.output = this.aiOutput;
        this.contentReady = true;
    }

    private async streamResponse(query: string) {
        const responseGen = this.aiService.streamResponse(query);
        let response: IPokedexResponse | undefined;
        
        // Get the initial response structure
        for await (const res of responseGen) {
            response = res;
            break; // We only need the first yield which contains the structure
        }
        
        if (!response) return;
        
        // Handle Pokemon data if found
        if (response.pokemonData) {
            this.pokemonData = response.pokemonData;
            this.pokemonDataOutput = this.pokemonDataService.formatPokemonDataToHTML(response.pokemonData, this.settings.language);
            this.contentReady = true; // Show Pokemon data immediately in right wing only
        } else {
            this.pokemonData = null;
            this.pokemonDataOutput = '';
        }
        
        // Stream AI response - ensure it never contains Pokemon data
        if (response.streamingResponse) {
            let aiText = '';
            let isFirstChunk = true;
            
            for await (const chunk of response.streamingResponse) {
                // Stop loading on first AI chunk
                if (isFirstChunk) {
                    this.isGenerating = false;
                    isFirstChunk = false;
                }
                
                aiText += chunk;
                this.aiOutput = aiText + '<span class="typing-cursor"></span>';
                // Update only the main screen output (AI synopsis) - never Pokemon data
                this.output = this.aiOutput;
                
                if (!this.contentReady) {
                    this.contentReady = true; // Show content on first AI chunk
                }
            }
            
            // Remove cursor after completion
            this.aiOutput = aiText;
            // Ensure main screen output only contains AI response, never Pokemon data
            this.output = this.aiOutput;
        } else {
            // If no streaming response, stop loading here
            this.isGenerating = false;
            if (!this.contentReady) {
                this.contentReady = true;
            }
        }
    }
    
    private isHtmlContent(text: string): boolean {
        // Check if text contains HTML tags
        return /<[^>]*>/.test(text);
    }

    quickSearch(pokemonName: string) {
        this.searchPokemon(pokemonName);
    }

    get isConnected(): boolean {
        if (!this.settingsService) return false;
        
        const currentSettings = this.settingsService.getSettings();
        const isFreeMode = PokedexSettingsServiceInstance.isFreeMode(currentSettings);
        
        // Consider both configured custom API key and free mode as connected
        return isFreeMode || this.settingsService.isConfigured();
    }

    // Event handlers for sub-components
    handleToggleSettings() {
        this.toggleSettings();
    }

    handleSearch(event: CustomEvent) {
        // For RWS $emit, the data is directly in event.detail
        const searchQuery = event.detail;
        this.searchPokemon(searchQuery);
    }

    handleSettingsSave(event: CustomEvent) {
        // Try event.detail first, then fall back to event if detail is undefined
        const settingsData = event.detail || event;
        
        this.saveSettings(settingsData);
        this.showSettings = false;
    }

    handleSettingsClear() {
        this.clearSettings();
        this.showSettings = false;
    }

    handleSettingsClose() {
        this.showSettings = false;
    }
}

PokedexMain.defineComponent();
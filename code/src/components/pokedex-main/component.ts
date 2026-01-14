import { RWSViewComponent, RWSView, RWSInject, observable, attr } from '@rws-framework/client';
import PokedexAiService, { PokedexAiServiceInstance } from '../../services/pokedex-ai.service';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '../../services/pokedex-settings.service';
import NotificationService, { NotificationServiceInstance } from '../../services/notification.service';
import SignalService, { SignalServiceInstance } from '../../services/signal.service';
import PokemonDataService, { PokemonDataServiceInstance } from '../../services/pokemon-data.service';
import { Events, PokedexEvents } from '../../event/events';
import { IPokedexSettings, IPokedexResponse } from '../../types/pokedex.types';
import { PokedexScreen } from '../pokedex-screen/component';

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
    @observable isStreaming: boolean = false;

    @observable isConnected: boolean = false;
    @observable hasConversation: boolean = false;
    
    // Track partial response for interruption handling
    private currentPartialResponse: string = '';
    
    // Reference to screen component
    private screen: PokedexScreen = null;

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
        
        await this.loadSettings();
        this.aiService.setSettings(this.settings);   
        
        // Get reference to screen component
        setTimeout(() => {
            this.screen = this.shadowRoot?.querySelector('pokedex-screen') as PokedexScreen;
        }, 100);
        
        // Subscribe to settings changes
        const settingsSignal = this.settingsService.getSettingsSignal();
        settingsSignal.value$.subscribe((newSettings: IPokedexSettings) => {
            this.settings = newSettings;
            this.aiService.setSettings(newSettings);
            this.checkConnection();
        });
        
        this.on('rws_modal:settings:close', () => {
            this.showSettings = false;
        });
    }

    async checkConnection() {        
        const isFreeMode = PokedexSettingsServiceInstance.isFreeMode(this.settings);
                
        this.isConnected = isFreeMode || await this.settingsService.isConfigured();
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

    private async loadSettings() {
        try {
            this.settings = await this.settingsService.getSettings();
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            this.settings = this.settingsService.getSettingsSync();
        }
    }

    toggleSettings() {
        this.showSettings = !this.showSettings;
    }

    async saveSettings(newSettings: IPokedexSettings) {
        try {
            await this.settingsService.saveSettings(newSettings);
            this.showSettings = false;
            
            // Emit settings changed event
            Events.emit(PokedexEvents.SETTINGS_CHANGED, newSettings);
            
            this.notificationService.showSuccess('pokedex.settingsSaved');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.notificationService.showError('Failed to save settings');
        }
    }

    async clearSettings() {
        try {
            await this.settingsService.clearSettings();
            this.notificationService.showWarning('pokedex.settingsCleared');
        } catch (error) {
            console.error('Failed to clear settings:', error);
            this.notificationService.showError('Failed to clear settings');
        }
    }

    async searchPokemon(searchQuery?: string) {
        const queryToUse = searchQuery || this.query;
        
        if (!queryToUse?.trim()) {
            this.notificationService.invalidInput();
            return;
        }

        // Check if we're in free mode (using default free key) - allow operation
        const currentSettings = await this.settingsService.getSettings();
        const isFreeMode = PokedexSettingsServiceInstance.isFreeMode(currentSettings);
        
        if (!isFreeMode && !this.settingsService.isConfigured()) {
            this.showSettings = true;
            this.notificationService.configurationNeeded();
            return;
        }

        // If currently generating/streaming, interrupt and start new search
        if (this.isGenerating || this.isStreaming) {
            this.aiService.interruptStreaming(this.currentPartialResponse);
            // Stop current generation/streaming states
            this.isGenerating = false;
            this.isStreaming = false;
            this.currentPartialResponse = ''; // Reset after interruption
            
            // Update screen component states
            if (this.screen) {
                this.screen.updateStreamingState(false);
                this.screen.updateGeneratingState(false);
            }
            // Note: Don't clear conversation here - let AI service handle the conversation state
        }

        this.isGenerating = true;
        this.isStreaming = this.settings.streaming;
        this.contentReady = false;
        this.output = '';
        this.pokemonDataOutput = '';
        this.aiOutput = '';
        
        // Update screen component states
        if (this.screen) {
            this.screen.updateGeneratingState(true);
            this.screen.updateStreamingState(this.settings.streaming);
        }
        
        // Only clear Pokemon data if starting a new conversation (no history)
        // For continuing conversations, preserve the Pokemon data from previous queries
        const preservePokemonData = this.aiService.hasConversationHistory() ? this.pokemonData : null;
        if (!this.aiService.hasConversationHistory()) {
            this.pokemonData = null;
        }
        this.query = queryToUse;
        
        // Emit search start event and show notification
        Events.emit(PokedexEvents.SEARCH_START, { query: queryToUse });
        this.notificationService.searchStarted(queryToUse);

        try {
            if (this.settings.streaming) {
                await this.streamResponse(queryToUse, preservePokemonData);
            } else {
                await this.generateResponse(queryToUse, preservePokemonData);
            }
            
            // Emit search complete event and show notification
            Events.emit(PokedexEvents.SEARCH_COMPLETE, { query: queryToUse, output: this.output });
            this.notificationService.searchCompleted(queryToUse);
            
        } catch (error) {
            console.error('pokedex.searchError'.t(), error);
            
            // Check if this is a rate limit error
            if (error) {
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
            this.isGenerating = false;
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

    private async generateResponse(query: string, preservePokemonData?: any) {
        const response: IPokedexResponse = await this.aiService.generateResponse(query, preservePokemonData);
        
        // Update conversation history after AI service has processed the user message
        if (this.screen) {
            this.screen.updateConversationHistory();
        }
        
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
        
        // Update hasConversation flag
        this.hasConversation = this.aiService.hasConversationHistory();
    }

    private async streamResponse(query: string, preservePokemonData?: any) {
        const responseGen = this.aiService.streamResponse(query, preservePokemonData);
        let response: IPokedexResponse | undefined;
        let aiText = '';
        
        // Store aiText for interruption handling
        this.currentPartialResponse = aiText;
        
        // Get the initial response structure
        for await (const res of responseGen) {
            response = res;
            
            // Update conversation history immediately after AI service adds user message
            // This happens on first yield, ensuring user message is visible before streaming starts
            if (this.screen) {
                this.screen.updateConversationHistory();
                // Make content visible to show the user message
                this.contentReady = true;
            }
            
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
            let isFirstChunk = true;
            
            for await (const chunk of response.streamingResponse) {
                // Check if we should stop (user interrupted)
                if (!this.isGenerating && !this.isStreaming) {
                    break;
                }
                
                // Stop loading on first AI chunk
                if (isFirstChunk) {
                    this.isGenerating = false;
                    isFirstChunk = false;
                }
                
                aiText += chunk;
                this.currentPartialResponse = aiText; // Keep tracking for interruption
                this.aiOutput = aiText + '<span class="typing-cursor"></span>';
                
                // Update screen component with streaming response
                if (this.screen) {
                    this.screen.updateStreamingResponse(aiText);
                    this.screen.updateStreamingState(true);
                }
                
                // Update only the main screen output (AI synopsis) - never Pokemon data
                this.output = this.aiOutput;
                
                if (!this.contentReady) {
                    this.contentReady = true; // Show content on first AI chunk
                }
            }
            
            // Complete the conversation entry FIRST with the accumulated AI response
            this.aiService.completeConversationEntry(aiText, response.pokemonData);
            
            // Remove cursor after completion
            this.aiOutput = aiText;
            // Ensure main screen output only contains AI response, never Pokemon data
            this.output = this.aiOutput;
            
            // Update screen component AFTER completing the conversation
            if (this.screen) {
                this.screen.updateStreamingState(false);
                this.screen.updateConversationHistory();
            }
            
            // Update hasConversation flag
            this.hasConversation = this.aiService.hasConversationHistory();
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

    // Event handlers for sub-components
    handleToggleSettings() {
        this.toggleSettings();
    }

    handleSearch(event: CustomEvent) {
        // For RWS $emit, the data is directly in event.detail
        const searchQuery = event.detail;
        this.searchPokemon(searchQuery);
    }

    handleInterrupt() {
        // Interrupt current streaming if active
        this.aiService.interruptStreaming(this.currentPartialResponse);
        
        // Clear conversation and start fresh
        this.aiService.clearConversation();
        this.pokemonData = null;
        this.isGenerating = false;
        this.isStreaming = false;
        this.currentPartialResponse = '';
        
        // Reset UI state
        this.output = '';
        this.aiOutput = '';
        this.pokemonDataOutput = '';
        this.contentReady = true; // Keep content area visible but empty
        
        // Update screen component to clear conversation history
        if (this.screen) {
            this.screen.updateStreamingState(false);
            this.screen.updateGeneratingState(false);
            this.screen.updateConversationHistory(); // This will clear since aiService has no history
        }
        
        // Update hasConversation flag
        this.hasConversation = false;
        
        this.notificationService.showInfo('pokedex.conversationCleared');
    }

    handleStopStreaming() {
        // Stop streaming but preserve conversation and data
        this.aiService.interruptStreaming(this.currentPartialResponse);
        
        // Update states
        this.isGenerating = false;
        this.isStreaming = false;
        
        // Update screen component states
        if (this.screen) {
            this.screen.updateStreamingState(false);
            this.screen.updateGeneratingState(false);
            this.screen.updateConversationHistory();
        }
        
        this.notificationService.showInfo('pokedex.streamingStopped');
    }

    async handleSettingsSave(event: CustomEvent) {
        // Try event.detail first, then fall back to event if detail is undefined
        const settingsData = event.detail || event;
        
        await this.saveSettings(settingsData);
        this.showSettings = false;
    }

    async handleSettingsClear() {
        await this.clearSettings();
        this.showSettings = false;
    }

    handleSettingsClose() {
        this.showSettings = false;
    }
}

PokedexMain.defineComponent();

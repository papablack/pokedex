import { RWSService, RWSInject } from '@rws-framework/client';
import { createOpenRouter, OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';
import { IPokedexSettings, IQueryAnalysis, IPokedexResponse, IConversationEntry } from '../types/pokedex.types';
import { TransformedPokemonData } from '../types/pokemon-data.types';
import PokemonDataService, { PokemonDataServiceInstance } from './pokemon-data.service';
import HtmlFormattingService, { HtmlFormattingServiceInstance } from './html-formatting.service';
import { PokedexSettingsService } from './pokedex-settings.service';
import NotificationService, { NotificationServiceInstance } from './notification.service';
import AIPromptService, { AIPromptServiceInstance } from './ai-prompt.service';

// Zod schema for structured query analysis
const QueryAnalysisSchema = z.object({
    isPokemonSearch: z.boolean().describe('True if the user is asking about specific Pokemon data/stats'),
    pokemonNames: z.array(z.string()).describe('List of Pokemon names mentioned in the query'),
    queryType: z.enum(['pokemon_data', 'game_help', 'general_discussion']).describe('Type of query: pokemon_data for stats/info, game_help for gameplay assistance including fan games like PokéMMO, general_discussion for Pokemon-related topics like lore/community'),
    confidence: z.number().min(0).max(1).describe('Confidence level in the analysis (0-1)'),
    extractedPokemonName: z.string().describe('Primary Pokemon name to search for if isPokemonSearch is true, empty string if no specific Pokemon')
});

export class PokedexAiService extends RWSService {
    private settings: IPokedexSettings = {} as IPokedexSettings;
    private openRouterClient: OpenRouterProvider;
    private conversationHistory: IConversationEntry[] = [];
    private currentStreamingController: AbortController | null = null;

    constructor(
        @PokemonDataService private pokemonDataService: PokemonDataServiceInstance,
        @HtmlFormattingService private htmlFormattingService: HtmlFormattingServiceInstance,
        @NotificationService private notificationService: NotificationServiceInstance,
        @AIPromptService private aiPromptService: AIPromptServiceInstance,
    ) {
        super();
    }

    private instantiateClient(){
        if (!this.settings || !this.settings.apiKey) {
            console.warn('API key not configured, skipping client instantiation');
            return;
        }
        this.openRouterClient = createOpenRouter({
            apiKey: this.settings.apiKey            
        });       
    }

    setSettings(settings: IPokedexSettings) {
        // Create a copy to avoid mutating the original settings
        let internalSettings = { ...settings };
        
        if(PokedexSettingsService.isFreeMode(settings)) {
            internalSettings.apiKey = PokedexSettingsService.getFreeKey();
            internalSettings.model = PokedexSettingsService.getFreeModel().value;
        }

        this.settings = internalSettings || {} as IPokedexSettings;
        this.instantiateClient();
    }

    addConversationEntry(query: string, response: string, pokemonData?: TransformedPokemonData) {
        this.conversationHistory.push({ query, response, pokemonData });
        // Keep only the last 5 entries to avoid context length issues
        if (this.conversationHistory.length > 5) {
            this.conversationHistory = this.conversationHistory.slice(-5);
        }
    }

    addUserMessage(query: string) {
        // Find the last entry
        const lastEntry = this.conversationHistory[this.conversationHistory.length - 1];
        
        // If there's an incomplete entry (only query, no response), mark as interrupted
        if (lastEntry && !lastEntry.response) {
            if (!lastEntry.response || lastEntry.response.trim() === '') {
                lastEntry.response = '[INTERRUPTED]';
            }
        }
        
        // Always add new conversation entry for the new query
        this.conversationHistory.push({ query, response: '', pokemonData: undefined });
    }

    completeConversationEntry(response: string, pokemonData?: TransformedPokemonData) {
        const lastEntry = this.conversationHistory[this.conversationHistory.length - 1];
        
        if (lastEntry && !lastEntry.response) {
            lastEntry.response = response;
            if (pokemonData) {
                lastEntry.pokemonData = pokemonData;
            }
        }
    }

    clearConversation() {
        this.conversationHistory = [];
    }

    interruptStreaming(partialResponse?: string) {
        // Store partial response in conversation if provided
        if (partialResponse && partialResponse.trim() !== '') {
            const lastEntry = this.conversationHistory[this.conversationHistory.length - 1];
            if (lastEntry && !lastEntry.response) {
                lastEntry.response = partialResponse.trim();
            }
        }
        
        if (this.currentStreamingController) {
            this.currentStreamingController.abort();
            this.currentStreamingController = null;
        }
    }

    hasConversationHistory(): boolean {
        return this.conversationHistory.length > 0;
    }

    getConversationHistory() {
        return [...this.conversationHistory]; // Return a copy
    }

    async analyzeQuery(query: string): Promise<IQueryAnalysis> {
        if (!this.settings.apiKey || !this.openRouterClient) {
            throw Error('pokedex.apiKeyRequired'.t());
        }

        try {
            const { object } = await generateObject({
                model: this.generateModelObject(PokedexSettingsService.getQueryModel().value),
                schema: QueryAnalysisSchema,
                messages: [
                    { 
                        role: 'system', 
                        content: this.aiPromptService.getQueryAnalysisSystemPrompt()
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.1, // Low temperature for consistent analysis
            });

            return object;
        } catch (error) {
            if (this.isRateLimitError(error)) {
                console.warn('Rate limit hit in analyzeQuery:', error);
                this.notificationService.showWarning('pokedx.rateLimitWait');
                throw new Error('pokedex.rateLimitWait'.t());
            }
            throw new Error('Failed to analyze query: ' + error.message);
        }
    }

    async generateResponse(query: string, preservePokemonData?: TransformedPokemonData): Promise<IPokedexResponse> {
        // Add user message to conversation history first
        this.addUserMessage(query);
        
        // First analyze the query
        const analysis = await this.analyzeQuery(query);
        console.log('Query analysis result:', analysis);
        let pokemonData: TransformedPokemonData | null = preservePokemonData || null; // Start with existing pokemon data

        // Only try to get NEW Pokemon data if the query is specifically asking for Pokemon data/stats
        // AND we found a different pokemon name
        if (analysis.isPokemonSearch && (analysis.extractedPokemonName || analysis.pokemonNames.length > 0)) {
            // Try extracted name first
            if (analysis.extractedPokemonName) {
                const newPokemonData = await this.pokemonDataService.getPokemonData(analysis.extractedPokemonName);
                console.log(`Trying extracted Pokemon name: ${analysis.extractedPokemonName}`);
                if (newPokemonData) {
                    pokemonData = newPokemonData; // Update to new pokemon data
                }
            }
            
            // If no data found, try all mentioned names
            if (!pokemonData && analysis.pokemonNames.length > 0) {
                for (const pokemonName of analysis.pokemonNames) {
                    const newPokemonData = await this.pokemonDataService.getPokemonData(pokemonName);
                    if (newPokemonData) {
                        console.log(`Found Pokemon data for: ${pokemonName}`);
                        pokemonData = newPokemonData; // Update to new pokemon data
                        break;
                    }
                }
            }
        } else {
            console.log('Query not eligible for PokeAPI search - isPokemonSearch:', analysis.isPokemonSearch, 'pokemonNames:', analysis.pokemonNames);
        }

        // Generate AI response (always, whether we have Pokemon data or not)
        const aiResponse = await this.generateAIResponse(query, analysis, pokemonData);

        // Complete the conversation entry with the AI response
        const lastEntry = this.conversationHistory[this.conversationHistory.length - 1];
        if (lastEntry && !lastEntry.response) {
            lastEntry.response = aiResponse;
            if (pokemonData) {
                lastEntry.pokemonData = pokemonData;
            }
            console.log('✅ Completed conversation entry with AI response (non-streaming)');
        } else {
            // Fallback: add as new entry if no incomplete entry found
            this.addConversationEntry(query, aiResponse, pokemonData);
        }

        return {
            analysis,
            pokemonData,
            aiResponse
        };
    }

    async *streamResponse(query: string, preservePokemonData?: TransformedPokemonData): AsyncGenerator<IPokedexResponse, void, unknown> {
        // Add user message to conversation history first
        this.addUserMessage(query);
        
        // Set up controller for this streaming request
        this.currentStreamingController = new AbortController();
        
        try {
            // First analyze the query
            const analysis = await this.analyzeQuery(query);
            let pokemonData: TransformedPokemonData | null = preservePokemonData || null; // Start with existing pokemon data

            // Only try to get NEW Pokemon data if the query is specifically asking for Pokemon data/stats
            // AND we found a different pokemon name
            if (analysis.isPokemonSearch && (analysis.extractedPokemonName || analysis.pokemonNames.length > 0)) {
                // Try extracted name first
                if (analysis.extractedPokemonName) {
                    const newPokemonData = await this.pokemonDataService.getPokemonData(analysis.extractedPokemonName);
                    console.log(`Trying extracted Pokemon name: ${analysis.extractedPokemonName}`);
                    if (newPokemonData) {
                        pokemonData = newPokemonData; // Update to new pokemon data
                    }
                }
                
                // If no data found, try all mentioned names
                if (!pokemonData && analysis.pokemonNames.length > 0) {
                    for (const pokemonName of analysis.pokemonNames) {
                        const newPokemonData = await this.pokemonDataService.getPokemonData(pokemonName);
                        if (newPokemonData) {
                            console.log(`Found Pokemon data for: ${pokemonName}`);
                            pokemonData = newPokemonData; // Update to new pokemon data
                            break;
                        }
                    }
                }
            } else {
                console.log('Query not eligible for PokeAPI search - isPokemonSearch:', analysis.isPokemonSearch, 'pokemonNames:', analysis.pokemonNames);
            }

            // Stream AI response
            const streamingResponse = this.streamAIResponse(query, analysis, pokemonData);
            
            // Yield the response structure with streaming generator
            yield {
                analysis,
                pokemonData,
                streamingResponse
            };
        } catch (error) {
            console.error('Error in streamResponse:', error);
            throw error;
        }
    }

    private async generateAIResponse(query: string, analysis: IQueryAnalysis, pokemonData?: TransformedPokemonData): Promise<string> {
        if (!this.settings.apiKey) {
            throw new Error('pokedex.apiKeyRequired'.t());
        }
        
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }

        // Check if query contains pokemon-related keywords - especially "poke"
        const pokemonKeywords = this.aiPromptService.getPokemonKeywords();
        const hasPokemonKeyword = pokemonKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        );

        // Simple check: if query contains "poke" anywhere, always answer
        const hasPoke = query.toLowerCase().includes('poke');

        console.log('Pokemon keywords check:', hasPokemonKeyword, 'Has "poke":', hasPoke, 'Query:', query);
        console.log('Pokemon data available:', !!pokemonData);
        console.log('Will use fallback:', (!hasPokemonKeyword && !hasPoke && !pokemonData));

        let systemPrompt = this.createSystemPrompt(analysis, pokemonData);
        
        // Only add instructions when NO Pokemon data exists
        if (!pokemonData) {
            // If no pokemon keywords/poke and no pokemon data, instruct to use fallback
            if (!hasPokemonKeyword && !hasPoke) {
                systemPrompt += this.aiPromptService.getFallbackInstruction();
                console.log('Added fallback instruction to system prompt');
            } else {
                systemPrompt += this.aiPromptService.getNonFallbackInstruction();
                console.log('Added NO FALLBACK instruction - pokemon related query detected');
            }
        } else {
            // When Pokemon data exists, the synopsis prompt should handle everything
            console.log('Using synopsis prompt - Pokemon data available, no additional instructions needed');
        }
    
        try {
            // Build messages with conversation history
            const messages: any[] = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history (excluding current incomplete entry)
            for (const entry of this.conversationHistory.slice(0, -1)) {
                // Always include the user message
                messages.push({ role: 'user', content: entry.query });
                
                // Only include assistant response if it's complete (not interrupted or empty)
                if (entry.response && entry.response !== '[INTERRUPTED]' && entry.response.trim() !== '') {
                    messages.push({ role: 'assistant', content: entry.response });
                }
                // If interrupted or incomplete, we skip the assistant response but keep the user message
            }

            // Add current query
            messages.push({ role: 'user', content: query });

            console.log('💬 Generate messages being sent to AI:');
            messages.forEach((msg, i) => {
                console.log(`  ${i}: ${msg.role} - ${msg.content.substring(0, 100)}...`);
            });
            console.log(`💬 Total messages: ${messages.length}`);
            console.log(`💬 Conversation history length: ${this.conversationHistory.length}`);

            const { text } = await generateText({
                model: this.generateModelObject(this.settings.model),
                messages,
                temperature: this.settings.temperature,
            });

            return text;
        } catch (error) {
            if (this.isRateLimitError(error)) {
                console.warn('Rate limit hit in generateAIResponse:', error);
                this.notificationService.showWarning('pokedex.rateLimitWait');
                throw new Error('pokedx.rateLimitWait'.t());
            }
            throw error;
        }
    }

    private async *streamAIResponse(query: string, analysis: IQueryAnalysis, pokemonData?: TransformedPokemonData): AsyncGenerator<string, void, unknown> {
        if (!this.settings.apiKey) {
            throw new Error('pokedex.apiKeyRequired'.t());
        }
        
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }

        // Check if query contains pokemon-related keywords - especially "poke"
        const pokemonKeywords = this.aiPromptService.getPokemonKeywords();
        const hasPokemonKeyword = pokemonKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        );

        // Simple check: if query contains "poke" anywhere, always answer
        const hasPoke = query.toLowerCase().includes('poke');

        let systemPrompt = this.createSystemPrompt(analysis, pokemonData);
        
        // Only add instructions when NO Pokemon data exists
        if (!pokemonData) {
            // If no pokemon keywords/poke and no pokemon data, instruct to use fallback
            if (!hasPokemonKeyword && !hasPoke) {
                systemPrompt += this.aiPromptService.getFallbackInstruction();
            } else {
                systemPrompt += this.aiPromptService.getNonFallbackInstruction();
            }
        }
        // When Pokemon data exists, the synopsis prompt should handle everything

        const model = this.generateModelObject(this.settings.model);

        try {
            // Build messages with conversation history
            const messages: any[] = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history (excluding current incomplete entry)
            for (const entry of this.conversationHistory.slice(0, -1)) {
                // Always include the user message
                messages.push({ role: 'user', content: entry.query });
                
                // Only include assistant response if it's complete (not interrupted or empty)
                if (entry.response && entry.response !== '[INTERRUPTED]' && entry.response.trim() !== '') {
                    messages.push({ role: 'assistant', content: entry.response });
                }
                // If interrupted or incomplete, we skip the assistant response but keep the user message
            }

            // Add current query
            messages.push({ role: 'user', content: query });

            console.log('💬 Stream messages being sent to AI:');
            messages.forEach((msg, i) => {
                console.log(`  ${i}: ${msg.role} - ${msg.content.substring(0, 100)}...`);
            });
            console.log(`💬 Total messages: ${messages.length}`);
            console.log(`💬 Conversation history length: ${this.conversationHistory.length}`);

            const stream = streamText({
                model,
                messages,
                temperature: this.settings.temperature,
                abortSignal: this.currentStreamingController?.signal,
            });

            for await (const chunk of stream.textStream) {
                yield chunk;
            }
        } catch (error) {
          
            if (this.isRateLimitError(error)) {
                console.warn('Rate limit hit in streamAIResponse:', error);
                this.notificationService.showWarning('pokedx.rateLimitWait');
                // Throw the error so the main component can handle it properly
                throw new Error('pokedx.rateLimitWait'.t());
            } else {
                throw error;
            }
        }
    }

    private createSystemPrompt(analysis?: IQueryAnalysis, pokemonData?: TransformedPokemonData): string {
        if (pokemonData) {
            // When we have Pokemon data, use the specialized synopsis prompt - NO POKEMON DATA IN AI RESPONSE
            let prompt = this.htmlFormattingService.createSynopsisPrompt(this.settings.language);
            
            prompt += this.aiPromptService.getSynopsisPromptContext(pokemonData.species || 'nieznany Pokemon');
            
            // Add context for synopsis only - no data formatting
            prompt += this.aiPromptService.getSynopsisInstructions();
            
            // Add generation context for commentary only
            if (pokemonData.generation) {
                prompt += this.aiPromptService.getGenerationContext(
                    pokemonData.generation.name, 
                    pokemonData.generation.id
                );
            }
            
            // Add location context for tips only
            if (pokemonData.locations && pokemonData.locations.length > 0) {
                const locationNames = pokemonData.locations.map((loc: any) => loc.name).join(', ');
                prompt += this.aiPromptService.getLocationContext(locationNames);
            }
            
            return prompt;
        }
        
        let basePrompt = this.htmlFormattingService.createSystemPrompt(this.settings.language);
        
        // Add modified behavior based on pokemon-related detection in the main generateResponse
        
        if (analysis && analysis.queryType === 'game_help') {
            basePrompt += this.aiPromptService.getGameHelpContext();
        } else if (analysis && analysis.queryType === 'general_discussion') {
            basePrompt += this.aiPromptService.getGeneralDiscussionContext();
        }
        
        // Add generation awareness for all prompts
        basePrompt += this.aiPromptService.getGenerationKnowledge();
        
        return basePrompt;
    }

    private isRateLimitError(error: any): boolean {
        // Check for HTTP 429 status code
        if (error?.error?.code === 429 || error?.code === 429 || error?.status === 429) {
            return true;
        }
        
        // Check for rate limit messages in error text
        const errorMessage = error?.message || error?.error?.message || '';
        const rateLimitKeywords = this.aiPromptService.getRateLimitKeywords();
        
        const hasRateLimitKeyword = rateLimitKeywords.some(keyword => 
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Check for OpenRouter specific rate limit error structure
        if (error?.name === 'AI_RetryError' && errorMessage.includes('Rate limit exceeded')) {
            return true;
        }
        
        return hasRateLimitKeyword;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private generateModelObject(model: string) {
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }
        return this.openRouterClient(model);
    }
}

// Export both default singleton and instance type for DI
export default PokedexAiService.getSingleton();
export { PokedexAiService as PokedexAiServiceInstance };

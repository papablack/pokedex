import { RWSService, RWSInject } from '@rws-framework/client';
import { createOpenRouter, OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';
import { IPokedexSettings, IQueryAnalysis, IPokedexResponse } from '../types/pokedex.types';
import PokemonDataService, { PokemonDataServiceInstance } from './pokemon-data.service';
import HtmlFormattingService, { HtmlFormattingServiceInstance } from './html-formatting.service';

// Zod schema for structured query analysis
const QueryAnalysisSchema = z.object({
    isPokemonSearch: z.boolean().describe('True if the user is asking about specific Pokemon data/stats'),
    pokemonNames: z.array(z.string()).describe('List of Pokemon names mentioned in the query'),
    queryType: z.enum(['pokemon_data', 'game_help', 'general_discussion']).describe('Type of query: pokemon_data for stats/info, game_help for gameplay assistance, general_discussion for other topics'),
    confidence: z.number().min(0).max(1).describe('Confidence level in the analysis (0-1)'),
    extractedPokemonName: z.string().optional().describe('Primary Pokemon name to search for if isPokemonSearch is true')
});

export class PokedexAiService extends RWSService {
    private settings: IPokedexSettings = {} as IPokedexSettings;
    private openRouterClient: OpenRouterProvider;

    constructor(
        @PokemonDataService private pokemonDataService: PokemonDataServiceInstance,
        @HtmlFormattingService private htmlFormattingService: HtmlFormattingServiceInstance
    ) {
        super();
    }

    private instantiateClient(){
        if (!this.settings || !this.settings.apiKey) {
            console.warn('API key not configured, skipping client instantiation');
            return;
        }
        this.openRouterClient = createOpenRouter({
            apiKey: this.settings.apiKey,
        });       
    }

    setSettings(settings: IPokedexSettings) {
        this.settings = settings || {} as IPokedexSettings;
        this.instantiateClient();
    }

    async analyzeQuery(query: string): Promise<IQueryAnalysis> {
        if (!this.settings.apiKey || !this.openRouterClient) {
            // Simple fallback analysis without AI - rely mostly on game help keywords
            const isGameHelp = this.isGameHelpQuery(query.toLowerCase());
            const potentialNames = this.extractPokemonNamesFromQuery(query.toLowerCase());
            
            return {
                isPokemonSearch: !isGameHelp && potentialNames.length > 0,
                pokemonNames: potentialNames,
                queryType: isGameHelp ? 'game_help' : 'general_discussion',
                confidence: 0.3, // Low confidence since we don't have AI analysis
                extractedPokemonName: potentialNames[0]
            };
        }

        try {
            const { object } = await generateObject({
                model: this.generateModelObject(this.settings.model),
                schema: QueryAnalysisSchema,
                messages: [
                    { 
                        role: 'system', 
                        content: 'Analyze user queries about Pokemon. Determine if they want specific Pokemon data/stats, game help (locations, how to find, where to catch, evolution methods), or general discussion. Be precise about Pokemon names mentioned. Game help includes questions about WHERE to find Pokemon, HOW to catch them, WHEN they evolve, WHAT items are needed, etc.' 
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.1, // Low temperature for consistent analysis
            });

            return object;
        } catch (error) {
            console.warn('Failed to analyze query with AI, using fallback:', error);
            // Enhanced fallback analysis
            const isGameHelp = this.isGameHelpQuery(query.toLowerCase());
            const potentialNames = this.extractPokemonNamesFromQuery(query.toLowerCase());
            
            return {
                isPokemonSearch: !isGameHelp && potentialNames.length > 0,
                pokemonNames: potentialNames,
                queryType: isGameHelp ? 'game_help' : 'general_discussion',
                confidence: 0.3, // Low confidence since we don't have AI analysis
                extractedPokemonName: potentialNames[0]
            };
        }
    }

    async generateResponse(query: string): Promise<IPokedexResponse> {
        // First analyze the query
        const analysis = await this.analyzeQuery(query);
        console.log('Query analysis result:', analysis);
        let pokemonData = null;

        // Always try to get Pokemon data if we have potential Pokemon names
        if (analysis.pokemonNames.length > 0) {
            // Try extracted name first
            if (analysis.extractedPokemonName) {
                pokemonData = await this.pokemonDataService.getPokemonData(analysis.extractedPokemonName);
            }
            
            // If no data found, try all mentioned names
            if (!pokemonData) {
                for (const pokemonName of analysis.pokemonNames) {
                    pokemonData = await this.pokemonDataService.getPokemonData(pokemonName);
                    if (pokemonData) {
                        console.log(`Found Pokemon data for: ${pokemonName}`);
                        break;
                    }
                }
            }
        }

        // Generate AI response (always, whether we have Pokemon data or not)
        const aiResponse = await this.generateAIResponse(query, analysis, pokemonData);

        return {
            analysis,
            pokemonData,
            aiResponse
        };
    }

    async *streamResponse(query: string): AsyncGenerator<IPokedexResponse, void, unknown> {
        // First analyze the query
        const analysis = await this.analyzeQuery(query);
        let pokemonData = null;

        // Always try to get Pokemon data if we have potential Pokemon names
        if (analysis.pokemonNames.length > 0) {
            // Try extracted name first
            if (analysis.extractedPokemonName) {
                pokemonData = await this.pokemonDataService.getPokemonData(analysis.extractedPokemonName);
            }
            
            // If no data found, try all mentioned names
            if (!pokemonData) {
                for (const pokemonName of analysis.pokemonNames) {
                    pokemonData = await this.pokemonDataService.getPokemonData(pokemonName);
                    if (pokemonData) {
                        console.log(`Found Pokemon data for: ${pokemonName}`);
                        break;
                    }
                }
            }
        }

        // Stream AI response
        const streamingResponse = this.streamAIResponse(query, analysis, pokemonData);
        
        // Yield the response structure with streaming generator
        yield {
            analysis,
            pokemonData,
            streamingResponse
        };
    }

    private async generateAIResponse(query: string, analysis: IQueryAnalysis, pokemonData?: any): Promise<string> {
        if (!this.settings.apiKey) {
            throw new Error('pokedex.apiKeyRequired'.t());
        }
        
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }
    
        const { text } = await generateText({
            model: this.generateModelObject(this.settings.model),
            messages: [
                { role: 'system', content: this.createSystemPrompt(analysis, pokemonData) },
                { role: 'user', content: query }
            ],
            temperature: this.settings.temperature,
        });

        return text;
    }

    private async *streamAIResponse(query: string, analysis: IQueryAnalysis, pokemonData?: any): AsyncGenerator<string, void, unknown> {
        if (!this.settings.apiKey) {
            throw new Error('pokedex.apiKeyRequired'.t());
        }
        
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }

        const model = this.generateModelObject(this.settings.model);

        const { textStream } = streamText({
            model,
            messages: [
                { role: 'system', content: this.createSystemPrompt(analysis, pokemonData) },
                { role: 'user', content: query }
            ],
            temperature: this.settings.temperature,
        });

        for await (const chunk of textStream) {
            yield chunk;
        }
    }

    private createSystemPrompt(analysis?: IQueryAnalysis, pokemonData?: any): string {
        if (pokemonData) {
            // When we have Pokemon data, use the specialized synopsis prompt
            return this.htmlFormattingService.createSynopsisPrompt(this.settings.language);
        }
        
        let basePrompt = this.htmlFormattingService.createSystemPrompt(this.settings.language);
        
        if (analysis && analysis.queryType === 'game_help') {
            basePrompt += `\n\nContext: The user is asking for game help or strategy advice. Provide practical, helpful information about Pokemon games, locations, strategies, tips, or gameplay mechanics.`;
        } else if (analysis && analysis.queryType === 'general_discussion') {
            basePrompt += `\n\nContext: The user wants to discuss Pokemon in general. Be conversational and engaging while providing interesting information.`;
        }
        
        return basePrompt;
    }

    private extractPokemonNamesFromQuery(query: string): string[] {
        // Extract potential Pokemon names from query
        const words = query.split(/\s+/);
        const potentialNames: string[] = [];
        
        for (const word of words) {
            // Clean the word of punctuation
            const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
            
            // Just take words that are reasonable length - no language assumptions
            if (cleanWord.length >= 3) {
                potentialNames.push(cleanWord);
            }
        }
        
        return potentialNames;
    }

    private isGameHelpQuery(query: string): boolean {
        const gameHelpKeywords = [
            'find', 'catch', 'where', 'location', 'route', 'area', 'region', 'johto', 'kanto', 'hoenn', 
            'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea', 'how to', 'evolve', 'evolution',
            'level up', 'trade', 'stone', 'item', 'obtain', 'get', 'encounter', 'spawn', 'appear',
            'forest', 'cave', 'city', 'town', 'gym', 'elite four', 'champion', 'safari', 'game corner',
            'slot', 'prize', 'fishing', 'surfing', 'rock smash', 'headbutt', 'time', 'day', 'night',
            'morning', 'evening', 'season', 'weather', 'rare', 'shiny', 'legendary', 'mythical'
        ];
        
        return gameHelpKeywords.some(keyword => query.includes(keyword));
    }

    private generateModelObject(model: string) {
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }
        return this.openRouterClient(this.settings.model);
    }
}

// Export both default singleton and instance type for DI
export default PokedexAiService.getSingleton();
export { PokedexAiService as PokedexAiServiceInstance };
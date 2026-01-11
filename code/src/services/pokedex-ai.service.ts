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
    queryType: z.enum(['pokemon_data', 'game_help', 'general_discussion']).describe('Type of query: pokemon_data for stats/info, game_help for gameplay assistance including fan games like PokéMMO, general_discussion for Pokemon-related topics like lore/community'),
    confidence: z.number().min(0).max(1).describe('Confidence level in the analysis (0-1)'),
    extractedPokemonName: z.string().describe('Primary Pokemon name to search for if isPokemonSearch is true, empty string if no specific Pokemon')
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
            apiKey: this.settings.apiKey            
        });       
    }

    setSettings(settings: IPokedexSettings) {
        this.settings = settings || {} as IPokedexSettings;
        this.instantiateClient();
    }

    async analyzeQuery(query: string): Promise<IQueryAnalysis> {
        if (!this.settings.apiKey || !this.openRouterClient) {
            // Simple fallback analysis without AI - rely mostly on game help keywords
            const isPokemonRelated = this.isGameHelpQuery(query.toLowerCase());
            const potentialNames = this.extractPokemonNamesFromQuery(query.toLowerCase());
            
            return {
                isPokemonSearch: potentialNames.length > 0,
                pokemonNames: potentialNames,
                queryType: isPokemonRelated ? 'game_help' : 'general_discussion',
                confidence: 0.3, // Low confidence since we don't have AI analysis
                extractedPokemonName: potentialNames[0] || ''
            };
        }

        try {
            const { object } = await generateObject({
                model: this.generateModelObject(this.settings.model),
                schema: QueryAnalysisSchema,
                messages: [
                    { 
                        role: 'system', 
                        content: 'Analyze user queries about Pokemon. Determine if they want specific Pokemon data/stats, game help (locations, how to find, where to catch, evolution methods), or general discussion about Pokemon-related topics. Be precise about Pokemon names mentioned. \n\nPOKEMON-RELATED CONTENT INCLUDES:\n- Official Pokemon games (Red, Blue, Gold, Silver, etc.)\n- Fan-made Pokemon games (PokéMMO, ROM hacks, fan games)\n- Pokemon mechanics, strategies, competitive play\n- Pokemon lore, characters, regions\n- Pokemon community, culture, memes\n- Anything involving Pokemon creatures, universe, or games\n\nGame help includes questions about WHERE to find Pokemon, HOW to catch them, WHEN they evolve, WHAT items are needed, etc.\n\nONLY classify as non-Pokemon if the question is completely unrelated to Pokemon universe (weather, politics, other franchises).' 
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
                extractedPokemonName: potentialNames[0] || ''
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

        // Check if query contains pokemon-related keywords - especially "poke"
        const pokemonKeywords = ['poke', 'pokemon', 'pokémon', 'pokemmo', 'pokeball'];
        const hasPokemonKeyword = pokemonKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        );

        // Simple check: if query contains "poke" anywhere, always answer
        const hasPoke = query.toLowerCase().includes('poke');

        console.log('Pokemon keywords check:', hasPokemonKeyword, 'Has "poke":', hasPoke, 'Query:', query);
        console.log('Will use fallback:', (!hasPokemonKeyword && !hasPoke && !pokemonData));

        let systemPrompt = this.createSystemPrompt(analysis, pokemonData);
        
        // If no pokemon keywords/poke and no pokemon data, instruct to use fallback
        if (!hasPokemonKeyword && !hasPoke && !pokemonData) {
            systemPrompt += `\n\nPytanie nie zawiera słów związanych z Pokemon i nie ma danych Pokemon - użyj fallback message.`;
            console.log('Added fallback instruction to system prompt');
        } else {
            systemPrompt += `\n\nTO PYTANIE ZAWIERA SŁOWA POKEMON - NIGDY NIE UŻYWAJ FALLBACK MESSAGE! Odpowiedz normalnie na pytanie o Pokemon/PokéMMO/grach Pokemon.\n\nWAŻNE: NIE UŻYWAJ MARKDOWN! Odpowiadaj TYLKO czystym HTML z klasami CSS.`;
            console.log('Added NO FALLBACK instruction - pokemon related query detected');
        }
    
        const { text } = await generateText({
            model: this.generateModelObject(this.settings.model),
            messages: [
                { role: 'system', content: systemPrompt },
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

        // Check if query contains pokemon-related keywords - especially "poke"
        const pokemonKeywords = ['poke', 'pokemon', 'pokémon', 'pokemmo', 'pokeball'];
        const hasPokemonKeyword = pokemonKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        );

        // Simple check: if query contains "poke" anywhere, always answer
        const hasPoke = query.toLowerCase().includes('poke');

        let systemPrompt = this.createSystemPrompt(analysis, pokemonData);
        
        // If no pokemon keywords/poke and no pokemon data, instruct to use fallback
        if (!hasPokemonKeyword && !hasPoke && !pokemonData) {
            systemPrompt += `\n\nPytanie nie zawiera słów związanych z Pokemon i nie ma danych Pokemon - użyj fallback message.`;
        } else {
            systemPrompt += `\n\nTO PYTANIE ZAWIERA SŁOWA POKEMON - NIGDY NIE UŻYWAJ FALLBACK MESSAGE! Odpowiedz normalnie na pytanie o Pokemon/PokéMMO/grach Pokemon.\n\nWAŻNE: NIE UŻYWAJ MARKDOWN! Odpowiadaj TYLKO czystym HTML z klasami CSS.`;
        }

        const model = this.generateModelObject(this.settings.model);

        const { textStream } = streamText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
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
            // When we have Pokemon data, use the specialized synopsis prompt with enhanced context
            let prompt = this.htmlFormattingService.createSynopsisPrompt(this.settings.language);
            
            // Add generation context
            if (pokemonData.generation) {
                prompt += `\n\nGeneration Context: This Pokemon is from ${pokemonData.generation.name} (Generation ${pokemonData.generation.id}).`;
            }
            
            // Add location context
            if (pokemonData.locations && pokemonData.locations.length > 0) {
                const locationNames = pokemonData.locations.map((loc: any) => loc.name).join(', ');
                prompt += `\n\nLocation Context: This Pokemon can be found in the following areas: ${locationNames}. Provide helpful tips about where to encounter this Pokemon.`;
            }
            
            return prompt;
        }
        
        let basePrompt = this.htmlFormattingService.createSystemPrompt(this.settings.language);
        
        // Add modified behavior based on pokemon-related detection in the main generateResponse
        
        if (analysis && analysis.queryType === 'game_help') {
            basePrompt += `\n\nContext: The user is asking for game help or strategy advice. Focus on providing detailed location information, evolution requirements, gameplay tips, and practical advice about Pokemon games, locations, strategies, or gameplay mechanics.`;
        } else if (analysis && analysis.queryType === 'general_discussion') {
            basePrompt += `\n\nContext: The user wants to discuss Pokemon in general. Be conversational and engaging while providing interesting information about Pokemon lore, comparisons, and general knowledge.`;
        }
        
        // Add generation awareness for all prompts
        basePrompt += `\n\nGeneration Knowledge: When discussing Pokemon, always mention which generation they are from if relevant. The generations are:
        - Generation I (Kanto): Red, Blue, Yellow
        - Generation II (Johto): Gold, Silver, Crystal  
        - Generation III (Hoenn): Ruby, Sapphire, Emerald
        - Generation IV (Sinnoh): Diamond, Pearl, Platinum
        - Generation V (Unova): Black, White, Black 2, White 2
        - Generation VI (Kalos): X, Y
        - Generation VII (Alola): Sun, Moon, Ultra Sun, Ultra Moon
        - Generation VIII (Galar): Sword, Shield
        - Generation IX (Paldea): Scarlet, Violet`;
        
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
            'morning', 'evening', 'season', 'weather', 'rare', 'shiny', 'legendary', 'mythical',
            'generation', 'gen', 'version', 'game', 'red', 'blue', 'yellow', 'gold', 'silver', 'crystal',
            'ruby', 'sapphire', 'emerald', 'diamond', 'pearl', 'platinum', 'black', 'white', 
            'sword', 'shield', 'scarlet', 'violet', 'sun', 'moon', 'ultra', 'lets go', 'arceus',
            'legends', 'brilliant', 'shining', 'move', 'tm', 'hm', 'ability', 'nature', 'iv', 'ev',
            'breeding', 'egg', 'hatch', 'wild', 'trainer', 'battle', 'competitive', 'strategy',
            'pokemmo', 'mmo', 'pokemon mmo', 'fan game', 'rom hack', 'hack', 'emulator', 'online',
            'multiplayer', 'server', 'community', 'what is', 'explain', 'about'
        ];
        
        // Check for Pokemon-related content regardless of game help keywords
        const pokemonRelatedKeywords = [
            'pokemon', 'pokémon', 'pokedex', 'pokeball', 'poke', 'trainer', 'gym', 'battle',
            'pokemmo', 'mmo', 'fan game', 'rom', 'hack', 'emulator'
        ];
        
        const isPokemonRelated = pokemonRelatedKeywords.some(keyword => query.includes(keyword));
        const isGameHelp = gameHelpKeywords.some(keyword => query.includes(keyword));
        
        // If it's Pokemon-related, it should be treated as valid content
        return isPokemonRelated || isGameHelp;
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
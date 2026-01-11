import { RWSService, RWSInject } from '@rws-framework/client';
import { createOpenRouter, OpenRouterProvider  } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import { IPokedexSettings } from '../types/pokedex.types';
import PokemonDataService, { PokemonDataServiceInstance } from './pokemon-data.service';
import HtmlFormattingService, { HtmlFormattingServiceInstance } from './html-formatting.service';

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

    async generateResponse(query: string): Promise<string> {
        // First get real Pokemon data
        const pokemonData = await this.pokemonDataService.getPokemonData(query);
        
        if (pokemonData) {
            return this.pokemonDataService.formatPokemonDataToHTML(pokemonData, this.settings.language);
        }

        // If no Pokemon data found, try AI fallback
        return this.generateAIResponse(query);
    }

    async *streamResponse(query: string): AsyncGenerator<string, void, unknown> {
        // First get real Pokemon data
        const pokemonData = await this.pokemonDataService.getPokemonData(query);
        
        if (pokemonData) {
            const htmlResponse = this.pokemonDataService.formatPokemonDataToHTML(pokemonData, this.settings.language);
            
            // For Pokemon data, yield complete HTML at once to avoid breaking tags
            yield htmlResponse;
            return;
        }

        // If no Pokemon data found, try AI streaming fallback
        yield* this.streamAIResponse(query);
    }

    private async generateAIResponse(query: string): Promise<string> {
        if (!this.settings.apiKey) {
            throw new Error('pokedex.apiKeyRequired'.t());
        }
        
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }
    
        const { text } = await generateText({
            model: this.generateModelObject(this.settings.model),
            messages: [
                { role: 'system', content: this.createSystemPrompt() },
                { role: 'user', content: `Podaj informacje o: ${query}` }
            ],
            temperature: this.settings.temperature,
        });

        return text;
    }

    private async *streamAIResponse(query: string): AsyncGenerator<string, void, unknown> {
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
                { role: 'system', content: this.createSystemPrompt() },
                { role: 'user', content: `Podaj informacje o: ${query}` }
            ],
            temperature: this.settings.temperature,
        });

        for await (const chunk of textStream) {
            yield chunk;
        }
    }

    private createSystemPrompt(): string {
        return this.htmlFormattingService.createSystemPrompt(this.settings.language);
    }

    private generateModelObject(model: string)
    {
        if (!this.openRouterClient) {
            throw new Error('pokedex.clientNotInitialized'.t());
        }
        return this.openRouterClient(this.settings.model);
    }
}

// Export both default singleton and instance type for DI
export default PokedexAiService.getSingleton();
export { PokedexAiService as PokedexAiServiceInstance };
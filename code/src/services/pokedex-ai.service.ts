import { RWSService, RWSInject } from '@rws-framework/client';
import { createOpenRouter, OpenRouterProvider  } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import { IPokedexSettings } from '../types/pokedex.types';
import PokemonDataService, { PokemonDataServiceInstance } from './pokemon-data.service';

export class PokedexAiService extends RWSService {
    private settings: IPokedexSettings = {} as IPokedexSettings;
    private openRouterClient: OpenRouterProvider;

    constructor(
        @PokemonDataService private pokemonDataService: PokemonDataServiceInstance
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
        const langMap = {
            'pl': 'polski',
            'en': 'angielski'
        };

        return `Jesteś zaawansowanym Pokedexem AI - encyklopedią Pokémonów. 
Odpowiadaj WYŁĄCZNIE w języku ${langMap[this.settings.language]}.
FORMATUJ odpowiedzi w CZYSTYM HTML bez znaczników <html>, <body> czy <head>.

Gdy użytkownik pyta o Pokémona, podaj informacje w następującym formacie HTML:

<div class="pokemon-info">
<h2 style="color: #e74c3c; margin-bottom: 15px;"><i class="fa fa-star"></i> NAZWA POKÉMONA</h2>

<div class="pokemon-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
<div>
<p><strong style="color: #3498db;">🔢 Numer Pokedex:</strong> #XXX</p>
<p><strong style="color: #27ae60;">🏷️ Typ:</strong> <span class="pokemon-type">TYP1/TYP2</span></p>
<p><strong style="color: #f39c12;">📏 Wzrost:</strong> X.X m</p>
<p><strong style="color: #9b59b6;">⚖️ Waga:</strong> XX kg</p>
</div>
<div>
<p><strong style="color: #e67e22;">🌍 Region:</strong> REGION</p>
<p><strong style="color: #1abc9c;">⚡ Główna zdolność:</strong> ZDOLNOŚĆ</p>
<p><strong style="color: #34495e;">🔮 Ukryta zdolność:</strong> ZDOLNOŚĆ</p>
</div>
</div>

<h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📊 Statystyki bazowe</h3>
<div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #e74c3c;">❤️ HP:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #f39c12;">⚔️ Atak:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #27ae60;">🛡️ Obrona:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #9b59b6;">✨ Sp.Atak:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #1abc9c;">🛡️ Sp.Obrona:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #3498db;">💨 Szybkość:</strong> XXX
</div>
</div>

<h3 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 5px;">📖 Opis</h3>
<p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #27ae60; border-radius: 5px; margin-bottom: 20px;">
OPIS POKÉMONA
</p>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
<div>
<h4 style="color: #27ae60;">✅ Mocny przeciwko:</h4>
<ul style="list-style: none; padding: 0;">
<li style="background: #d5f5d5; padding: 5px; margin: 3px 0; border-radius: 3px;">• TYP</li>
</ul>
</div>
<div>
<h4 style="color: #e74c3c;">❌ Słaby przeciwko:</h4>
<ul style="list-style: none; padding: 0;">
<li style="background: #fdd5d5; padding: 5px; margin: 3px 0; border-radius: 3px;">• TYP</li>
</ul>
</div>
</div>

<div style="margin-top: 20px;">
<h4 style="color: #f39c12;">⚔️ Ewolucje:</h4>
<div style="background: #fff3cd; padding: 10px; border-radius: 5px;">
INFORMACJE O EWOLUCJI
</div>
</div>

<div style="margin-top: 15px; background: #e3f2fd; padding: 15px; border-radius: 8px;">
<h4 style="color: #1976d2; margin-top: 0;">💡 Ciekawostki:</h4>
<p>CIEKAWOSTKI O POKÉMONIE</p>
</div>
</div>

Używaj kolorowych stylów CSS inline i emoji. Bądź entuzjastyczny jak prawdziwy Pokedex!
Jeśli użytkownik pyta o coś innego niż Pokémony, odpowiedz: 
<div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 10px;">
<h3 style="color: #856404;">🤖 Jestem Pokedexem AI!</h3>
<p>Mogę pomóc tylko z informacjami o Pokémonach. Zapytaj mnie o swojego ulubionego Pokémona! 🔍✨</p>
</div>`;
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
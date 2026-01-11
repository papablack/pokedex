import { RWSService } from '@rws-framework/client';
import { createOpenRouter, OpenRouterProvider  } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import { IPokedexSettings } from '../types/pokedex.types';

export class PokedexAiService extends RWSService {
    private settings: IPokedexSettings = {} as IPokedexSettings;
    private openRouterClient: OpenRouterProvider;

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

    private createSystemPrompt(): string {
        const langMap = {
            'pl': 'polski',
            'en': 'angielski'
        };

        return `Jesteś zaawansowanym Pokedexem AI - encyklopedią Pokémonów. 
Odpowiadaj WYŁĄCZNIE w języku ${langMap[this.settings.language]}.

Gdy użytkownik pyta o Pokémona, podaj:
📛 NAZWA (w tym japońska jeśli znasz)
🔢 NUMER w Pokedexie  
🏷️ TYP/TYPY
📏 WZROST i WAGA
⚡ PODSTAWOWE STATYSTYKI (HP, Atak, Obrona, Sp.Atak, Sp.Obrona, Szybkość)
🎯 ZDOLNOŚCI (normalne i ukryte)
🌍 REGION pochodzenia
📖 KRÓTKI OPIS z gier/anime
💡 CIEKAWOSTKI
⚔️ EWOLUCJE (jeśli są)
✅ MOCNE STRONY (przeciw jakim typom)
❌ SŁABE STRONY (przeciw jakim typom)

Formatuj odpowiedź czytelnie używając emoji. Bądź entuzjastyczny jak prawdziwy Pokedex!
Jeśli użytkownik pyta o coś innego niż Pokémony, odpowiedz krótko że jesteś Pokedexem i możesz pomóc tylko z informacjami o Pokémonach.`;
    }

    async generateResponse(query: string): Promise<string> {
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

    async *streamResponse(query: string): AsyncGenerator<string, void, unknown> {
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
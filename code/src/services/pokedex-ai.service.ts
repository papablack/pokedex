import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import { IPokedexSettings } from '../types/pokedex.types';

export class PokedexAiService {
    private settings: IPokedexSettings;

    constructor(settings: IPokedexSettings) {
        this.settings = settings;
    }

    updateSettings(settings: IPokedexSettings) {
        this.settings = settings;
    }

    private createSystemPrompt(): string {
        const langMap = {
            'pl': 'polski',
            'en': 'angielski', 
            'de': 'niemiecki',
            'ja': 'japoński'
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

        const model = openrouter(this.settings.model, {
            apiKey: this.settings.apiKey,
        });

        const { text } = await generateText({
            model,
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

        const model = openrouter(this.settings.model, {
            apiKey: this.settings.apiKey,
        });

        const { textStream } = await streamText({
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
}
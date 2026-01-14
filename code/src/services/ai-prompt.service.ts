import { RWSService } from '@rws-framework/client';
import { DefaultLayout } from '@front/layouts/default-layout/component';
import { IQueryAnalysis } from '../types/pokedex.types';
import { TransformedPokemonData } from '../types/pokemon-data.types';

export class AIPromptService extends RWSService {
    
    getQueryAnalysisSystemPrompt(): string {
        return 'Analyze user queries about Pokemon. Determine if they want specific Pokemon data/stats, game help (locations, how to find, where to catch, evolution methods), or general discussion about Pokemon-related topics. Be precise about Pokemon names mentioned. \n\nPOKEMON-RELATED CONTENT INCLUDES:\n- Official Pokemon games (Red, Blue, Gold, Silver, etc.)\n- Fan-made Pokemon games (PokéMMO, ROM hacks, fan games)\n- Pokemon mechanics, strategies, competitive play\n- Pokemon lore, characters, regions\n- Pokemon community, culture, memes\n- Anything involving Pokemon creatures, universe, or games\n\nGame help includes questions about WHERE to find Pokemon, HOW to catch them, WHEN they evolve, WHAT items are needed, etc.\n\nONLY classify as non-Pokemon if the question is completely unrelated to Pokemon universe (weather, politics, other franchises).';
    }

    getFallbackInstruction(): string {
        return '\n\nPytanie nie zawiera słów związanych z Pokemon i nie ma danych Pokemon - użyj fallback message.';
    }

    getNonFallbackInstruction(): string {
        return '\n\nTO PYTANIE ZAWIERA SŁOWA POKEMON - NIGDY NIE UŻYWAJ FALLBACK MESSAGE! Odpowiedz normalnie na pytanie o Pokemon/PokéMMO/grach Pokemon.\n\nWAŻNE: NIE UŻYWAJ MARKDOWN! Odpowiadaj TYLKO czystym HTML z klasami CSS.';
    }

    getSynopsisPromptContext(pokemonName: string): string {
        return `\n\nKONTEKST: Masz dostęp do kompletnych danych Pokemon o nazwie "${pokemonName}". Wszystkie szczegółowe dane (statystyki, ruchy, ewolucje, typy) są już wyświetlone w prawym panelu dla użytkownika.`;
    }

    getSynopsisInstructions(): string {
        return `\n\nWAŻNE: 
- TWOJA ROLA: Tylko komentarz i ciekawostki o tym Pokemonie
- NIE DUPLIKUJ danych już wyświetlonych w prawym panelu
- SKUP SIĘ na strategiach, ciekawostkach, porównaniach
- WYKORZYSTAJ dostępne dane do stworzenia angażującego komentarza
- ZAWSZE odpowiadaj jakby znałeś tego Pokemona (nie pytaj o szczegóły)`;
    }

    getGenerationContext(generationName: string, generationId: number): string {
        return `\n\nKontekst generacji: Ten Pokemon pochodzi z ${generationName} (Generacja ${generationId}). Możesz wspomnieć o tym w kontekście historii gier Pokemon.`;
    }

    getLocationContext(locationNames: string): string {
        return `\n\nKontekst lokacji: Ten Pokemon można spotkać w następujących obszarach: ${locationNames}. Możesz dać wskazówki gdzie go znaleźć, ale NIE wyświetlaj ponownie tych danych.`;
    }

    getGameHelpContext(): string {
        return `\n\nContext: The user is asking for game help or strategy advice. Focus on providing detailed location information, evolution requirements, gameplay tips, and practical advice about Pokemon games, locations, strategies, or gameplay mechanics.`;
    }

    getGeneralDiscussionContext(): string {
        return `\n\nContext: The user wants to discuss Pokemon in general. Be conversational and engaging while providing interesting information about Pokemon lore, comparisons, and general knowledge.`;
    }

    getGenerationKnowledge(): string {
        return `\n\nGeneration Knowledge: When discussing Pokemon, always mention which generation they are from if relevant. The generations are:
        - Generation I (Kanto): Red, Blue, Yellow
        - Generation II (Johto): Gold, Silver, Crystal  
        - Generation III (Hoenn): Ruby, Sapphire, Emerald
        - Generation IV (Sinnoh): Diamond, Pearl, Platinum
        - Generation V (Unova): Black, White, Black 2, White 2
        - Generation VI (Kalos): X, Y
        - Generation VII (Alola): Sun, Moon, Ultra Sun, Ultra Moon
        - Generation VIII (Galar): Sword, Shield
        - Generation IX (Paldea): Scarlet, Violet`;
    }

    getPokemonKeywords(): string[] {
        return ['poke', 'pokemon', 'pokémon', 'pokemmo', 'pokeball'];
    }

    getRateLimitKeywords(): string[] {
        return [
            'rate limit',
            'Rate limit exceeded',
            'free-models-per-day',
            'Too Many Requests',
            '429'
        ];
    }
}

export default AIPromptService.getSingleton();
export { AIPromptService as AIPromptServiceInstance };
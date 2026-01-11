export interface IPokedexSettings {
    apiKey: string;
    model: string;
    language: string;
    temperature: number;
    streaming: boolean;
}

export interface IAiResponse {
    choices: Array<{
        message?: {
            content: string;
        };
        delta?: {
            content?: string;
        };
    }>;
}

export interface IQueryAnalysis {
    isPokemonSearch: boolean;
    pokemonNames: string[];
    queryType: 'pokemon_data' | 'game_help' | 'general_discussion';
    confidence: number;
    extractedPokemonName?: string;
}

export interface IPokedexResponse {
    analysis: IQueryAnalysis;
    pokemonData?: any;
    aiResponse?: string;
    streamingResponse?: AsyncGenerator<string, void, unknown>;
}
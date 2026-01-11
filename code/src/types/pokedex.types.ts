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

export interface IPokemonLocationArea {
    name: string;
    url: string;
    encounters: any[];
}

export interface IGenerationInfo {
    id: number;
    name: string;
    displayName: string;
}

export interface IPokemonData {
    num: number;
    species: string;
    types: { name: string }[];
    height: number;
    weight: number;
    baseStats: {
        hp: number;
        attack: number;
        defense: number;
        specialattack: number;
        specialdefense: number;
        speed: number;
    };
    abilities: {
        first?: { name: string; desc: string };
        second?: { name: string; desc: string };
        hidden?: { name: string; desc: string };
    };
    color: string;
    eggGroups: string[];
    evolutionLevel?: number;
    evolutions: { species: string; evolutionLevel?: number }[];
    preevolutions: { species: string; evolutionLevel?: number }[];
    flavorTexts: { flavor: string; game: string }[];
    sprite: string;
    shinySprite: string;
    legendary: boolean;
    mythical: boolean;
    catchRate: {
        base: number;
        percentageWithOrdinaryPokeballAtFullHealth: number;
    };
    gender: {
        male: number;
        female: number;
    };
    generation?: {
        id: number;
        name: string;
    };
    locations: IPokemonLocationArea[];
}
import type { 
    NamedAPIResource, 
    VersionEncounterDetail
} from 'pokenode-ts';

export interface PokemonLocationData {
    locationAreas: LocationArea[];
}

export interface LocationArea {
    name: string;
    url: string;
    encounters: VersionEncounterDetail[];
}

export interface PokemonAbility {
    name: string;
    desc: string;
}

export interface PokemonAbilities {
    first: PokemonAbility | null;
    second: PokemonAbility | null;
    hidden: PokemonAbility | null;
}

export interface PokemonStats {
    hp: number;
    attack: number;
    defense: number;
    specialattack: number;
    specialdefense: number;
    speed: number;
}

export interface PokemonMove {
    name: string;
    type: string;
    category: string;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    priority: number;
    levelLearned: number;
    learnMethod: string;
    description: string;
}

export interface PokemonEvolution {
    species: string;
    evolutionLevel: number | null;
}

export interface PokemonFlavorText {
    flavor: string;
    game: string;
}

export interface PokemonGeneration {
    id: number;
    name: string;
}

export interface PokemonCatchRate {
    base: number;
    percentageWithOrdinaryPokeballAtFullHealth: number;
}

export interface PokemonGender {
    male: number;
    female: number;
}

export interface TransformedPokemonData {
    num: number;
    species: string;
    types: { name: string }[];
    height: number;
    weight: number;
    baseStats: PokemonStats;
    abilities: PokemonAbilities;
    color: string;
    eggGroups: string[];
    evolutionLevel: number | null;
    evolutions: PokemonEvolution[];
    preevolutions: PokemonEvolution[];
    flavorTexts: PokemonFlavorText[];
    sprite: string | null;
    shinySprite: string | null;
    legendary: boolean;
    mythical: boolean;
    catchRate: PokemonCatchRate;
    gender: PokemonGender;
    generation: PokemonGeneration | null;
    locations: LocationArea[];
    moves: PokemonMove[];
}

export interface GenerationData {
    id: number;
    name: string;
    main_region: NamedAPIResource;
    pokemon_species: NamedAPIResource[];
}
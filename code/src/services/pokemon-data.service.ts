import { RWSService, RWSInject } from '@rws-framework/client';
import Pokedex from '@sherwinski/pokeapi-ts';
import { getCurrentLanguage } from '../translations/trans';

// Import official PokeAPI types from pokenode-ts
import type { 
    Pokemon, 
    PokemonSpecies, 
    Move, 
    Ability, 
    NamedAPIResource, 
    VersionEncounterDetail,
    LocationAreaEncounter,
    EvolutionChain,
    ChainLink,
    Generation,
    FlavorText,
    PokemonMove as PokeApiPokemonMove,
    PokemonMoveVersion
} from 'pokenode-ts';

// Import custom types
import type {
    PokemonLocationData,
    LocationArea,
    PokemonAbility,
    PokemonAbilities,
    PokemonStats,
    PokemonMove,
    PokemonEvolution,
    PokemonFlavorText,
    PokemonGeneration,
    PokemonCatchRate,
    PokemonGender,
    TransformedPokemonData,
    GenerationData
} from '../types/pokemon-data.types';

export class PokemonDataService extends RWSService {
    private pokedex: Pokedex;

    constructor(    ) {
        super();
        this.pokedex = new Pokedex();
    }

    async getPokemonData(pokemonName: string): Promise<TransformedPokemonData | null> {
        try {
            let pokemon: Pokemon | null = null;
            
            // Try to get Pokemon data using SDK
            try {
                pokemon = await this.pokedex.pokemon.searchByName(pokemonName.toLowerCase()) as Pokemon;
            } catch (error) {
                console.warn(`Failed to find Pokemon by name: ${pokemonName}, trying by ID...`);
                
                // If name search fails, try to parse as ID or use direct API call as fallback
                const pokemonId = parseInt(pokemonName);
                if (!isNaN(pokemonId)) {
                    pokemon = await this.pokedex.pokemon.searchById(pokemonId) as Pokemon;
                } else {
                    // Last resort: direct API call
                    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}/`);
                    pokemon = await response.json() as Pokemon;
                }
            }
            
            if (!pokemon) {
                return null;
            }

            // Get species data for additional info
            const speciesUrl = pokemon.species.url;
            const speciesId = speciesUrl.split('/').slice(-2, -1)[0];
            const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`);
            const species = await speciesResponse.json() as PokemonSpecies;
            
            // Get location data
            const locationAreas = await this.getPokemonLocationData(pokemon.id);
            
            // Transform data to match expected format
            const transformedData = await this.transformPokemonData(pokemon, species, locationAreas);
            
            return transformedData;

        } catch (error) {
            console.error(`❌ Error fetching Pokemon data for ${pokemonName}:`, error);
            return null;
        }
    }

    private async getPokemonLocationData(pokemonId: number): Promise<PokemonLocationData> {
        try {
            // Use direct API call since SDK doesn't expose location encounters endpoint
            const encountersResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`);
            const encounters = await encountersResponse.json() as LocationAreaEncounter[];
            const locationAreas: LocationArea[] = [];
            
            for (const encounter of encounters.slice(0, 10)) { // Limit to 10 locations
                try {
                    const locationAreaResponse = await fetch(encounter.location_area.url);
                    const locationArea = await locationAreaResponse.json();
                    locationAreas.push({
                        name: locationArea.name,
                        url: locationArea.location.url,
                        encounters: encounter.version_details || []
                    });
                } catch (err) {
                    console.warn('Failed to fetch location area:', encounter.location_area.name);
                }
            }
            
            return { locationAreas };
        } catch (error) {
            console.warn('Failed to fetch location data:', error);
            return { locationAreas: [] };
        }
    }

    private async transformPokemonData(pokemon: Pokemon, species: PokemonSpecies, locationData: PokemonLocationData): Promise<TransformedPokemonData> {
        // Transform PokeAPI data to match expected format
        const abilities: PokemonAbilities = {
            first: pokemon.abilities[0] ? {
                name: pokemon.abilities[0].ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities[0].ability.name)
            } : null,
            second: pokemon.abilities[1] && !pokemon.abilities[1].is_hidden ? {
                name: pokemon.abilities[1].ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities[1].ability.name)
            } : null,
            hidden: pokemon.abilities.find((a) => a.is_hidden) ? {
                name: pokemon.abilities.find((a) => a.is_hidden)!.ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities.find((a) => a.is_hidden)!.ability.name)
            } : null
        };

        // Get evolution chain if available
        let evolutions: PokemonEvolution[] = [];
        let preevolutions: PokemonEvolution[] = [];
        if (species?.evolution_chain?.url) {
            try {
                const evolutionChainId = species.evolution_chain.url.split('/').slice(-2, -1)[0];
                const evolutionResponse = await fetch(`https://pokeapi.co/api/v2/evolution-chain/${evolutionChainId}/`);
                const evolutionData = await evolutionResponse.json() as EvolutionChain;
                const evolutionInfo = this.parseEvolutionChain(evolutionData, pokemon.name);
                evolutions = evolutionInfo.evolutions;
                preevolutions = evolutionInfo.preevolutions;
            } catch (err) {
                console.warn('Failed to fetch evolution data');
            }
        }

        // Get moves data
        const movesData = await this.getPokemonMoves(pokemon);

        return {
            num: pokemon.id,
            species: this.capitalizePokemonName(pokemon.species.name),
            types: pokemon.types.map((t) => ({ name: t.type.name })),
            height: pokemon.height / 10, // Convert to meters
            weight: pokemon.weight / 10, // Convert to kg
            baseStats: {
                hp: pokemon.stats.find((s) => s.stat.name === 'hp')?.base_stat || 0,
                attack: pokemon.stats.find((s) => s.stat.name === 'attack')?.base_stat || 0,
                defense: pokemon.stats.find((s) => s.stat.name === 'defense')?.base_stat || 0,
                specialattack: pokemon.stats.find((s) => s.stat.name === 'special-attack')?.base_stat || 0,
                specialdefense: pokemon.stats.find((s) => s.stat.name === 'special-defense')?.base_stat || 0,
                speed: pokemon.stats.find((s) => s.stat.name === 'speed')?.base_stat || 0
            },
            abilities,
            color: species?.color?.name || 'unknown',
            eggGroups: species?.egg_groups?.map((g) => g.name) || [],
            evolutionLevel: null, // Would need more complex logic
            evolutions,
            preevolutions,
            flavorTexts: await this.getLocalizedFlavorTexts(species?.flavor_text_entries || []),
            sprite: pokemon.sprites.front_default,
            shinySprite: pokemon.sprites.front_shiny,
            legendary: species?.is_legendary || false,
            mythical: species?.is_mythical || false,
            catchRate: {
                base: species?.capture_rate || 0,
                percentageWithOrdinaryPokeballAtFullHealth: species?.capture_rate ? Math.round((species.capture_rate / 255) * 100) : 0
            },
            gender: {
                male: species?.gender_rate === -1 ? 0 : (8 - (species?.gender_rate || 4)) / 8 * 100,
                female: species?.gender_rate === -1 ? 0 : (species?.gender_rate || 4) / 8 * 100
            },
            generation: species?.generation ? {
                id: parseInt(species.generation.url.split('/').slice(-2, -1)[0]),
                name: species.generation.name
            } : null,
            locations: locationData.locationAreas,
            moves: movesData.levelUp,
            tmMoves: movesData.tm,
            hmMoves: movesData.hm
        };
    }

    private async getAbilityDescription(abilityName: string): Promise<string> {
        try {
            const ability = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}/`).then(res => res.json());
            let currentLang: string;
            try {
                currentLang = await getCurrentLanguage();
            } catch (error) {
                console.warn('Failed to get current language, using default:', error);
                currentLang = 'pl'; // fallback
            }
            const langCode = this.getPokeApiLanguageCode(currentLang);
            
            // Try to find description in current language first
            let entry = ability.effect_entries.find((entry: any) => entry.language.name === langCode);
            
            // Fallback to English if current language not available
            if (!entry) {
                entry = ability.effect_entries.find((entry: any) => entry.language.name === 'en');
            }
            
            return entry?.effect || 'No description available';
        } catch (error) {
            return 'No description available';
        }
    }

    private async getMoveDescription(moveName: string): Promise<string> {
        try {
            const move = await fetch(`https://pokeapi.co/api/v2/move/${moveName}/`).then(res => res.json());
            const currentLang = await getCurrentLanguage();
            const langCode = this.getPokeApiLanguageCode(currentLang);
            
            // Try to find description in current language first
            let entry = move.effect_entries.find((entry: any) => entry.language.name === langCode);
            
            // Fallback to English if current language not available
            if (!entry) {
                entry = move.effect_entries.find((entry: any) => entry.language.name === 'en');
            }
            
            return entry?.short_effect || entry?.effect || 'No description available';
        } catch (error) {
            return 'No description available';
        }
    }

    private async getPokemonMoves(pokemon: Pokemon): Promise<{ levelUp: PokemonMove[], tm: PokemonMove[], hm: PokemonMove[] }> {
        try {
            const levelUpMoves: PokemonMove[] = [];
            const tmMoves: PokemonMove[] = [];
            const hmMoves: PokemonMove[] = [];
            
            // Get moves learned by level up (limit to most recent generation moves for performance)
            const levelUpMovesData = pokemon.moves
                .filter((moveData) => {
                    return moveData.version_group_details.some((vgd) => 
                        vgd.move_learn_method.name === 'level-up'
                    );
                })
                .slice(0, 20) // Limit to 20 moves for performance
                .sort((a, b) => {
                    // Sort by level learned (ascending)
                    const aLevel = a.version_group_details.find((vgd) => 
                        vgd.move_learn_method.name === 'level-up'
                    )?.level_learned_at || 0;
                    const bLevel = b.version_group_details.find((vgd) => 
                        vgd.move_learn_method.name === 'level-up'
                    )?.level_learned_at || 0;
                    return aLevel - bLevel;
                });
            
            // Get TM moves
            const tmMovesData = pokemon.moves
                .filter((moveData) => {
                    return moveData.version_group_details.some((vgd) => 
                        vgd.move_learn_method.name === 'machine'
                    );
                })
                .slice(0, 15); // Limit to 15 TM moves for performance

            // Get HM moves (if any exist)
            const hmMovesData = pokemon.moves
                .filter((moveData) => {
                    return moveData.version_group_details.some((vgd) => 
                        vgd.move_learn_method.name === 'machine' && 
                        // HMs are typically identified by specific machine numbers or move names
                        // This is a simplified check - in reality you might need more complex logic
                        ['cut', 'fly', 'surf', 'strength', 'flash', 'rock-smash', 'waterfall', 'dive'].includes(moveData.move.name)
                    );
                });
            
            // Process level-up moves
            for (const moveData of levelUpMovesData) {
                try {
                    const moveUrl = moveData.move.url;
                    const moveResponse = await fetch(moveUrl);
                    const move = await moveResponse.json() as Move;
                    
                    const levelUpDetail = moveData.version_group_details.find((vgd) => 
                        vgd.move_learn_method.name === 'level-up'
                    );
                    
                    levelUpMoves.push({
                        name: this.capitalizePokemonName(move.name),
                        type: move.type?.name || 'unknown',
                        category: move.damage_class?.name || 'status',
                        power: move.power,
                        accuracy: move.accuracy,
                        pp: move.pp,
                        priority: move.priority,
                        levelLearned: levelUpDetail?.level_learned_at || 0,
                        learnMethod: 'level-up',
                        description: await this.getMoveDescription(move.name)
                    });
                } catch (err) {
                    console.warn(`Failed to fetch move details: ${moveData.move.name}`);
                }
            }

            // Process TM moves
            for (const moveData of tmMovesData) {
                try {
                    const moveUrl = moveData.move.url;
                    const moveResponse = await fetch(moveUrl);
                    const move = await moveResponse.json() as Move;
                    
                    // Check if it's actually an HM move
                    const isHMMove = ['cut', 'fly', 'surf', 'strength', 'flash', 'rock-smash', 'waterfall', 'dive'].includes(move.name);
                    
                    const moveEntry = {
                        name: this.capitalizePokemonName(move.name),
                        type: move.type?.name || 'unknown',
                        category: move.damage_class?.name || 'status',
                        power: move.power,
                        accuracy: move.accuracy,
                        pp: move.pp,
                        priority: move.priority,
                        levelLearned: 0, // TMs/HMs don't have level requirements
                        learnMethod: isHMMove ? 'hm' : 'tm',
                        description: await this.getMoveDescription(move.name)
                    };

                    if (isHMMove) {
                        hmMoves.push(moveEntry);
                    } else {
                        tmMoves.push(moveEntry);
                    }
                } catch (err) {
                    console.warn(`Failed to fetch TM/HM move details: ${moveData.move.name}`);
                }
            }
            
            return {
                levelUp: levelUpMoves,
                tm: tmMoves,
                hm: hmMoves
            };
        } catch (error) {
            console.warn('Failed to fetch moves:', error);
            return {
                levelUp: [],
                tm: [],
                hm: []
            };
        }
    }

    private capitalizePokemonName(name: string): string {
        return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
    }

    private parseEvolutionChain(chain: EvolutionChain, currentPokemonName: string): { evolutions: PokemonEvolution[], preevolutions: PokemonEvolution[] } {
        const evolutions: PokemonEvolution[] = [];
        const preevolutions: PokemonEvolution[] = [];
        
        // Helper to get evolution method details
        const getEvolutionMethod = (details: any): string | null => {
            if (!details || details.length === 0) return null;
            
            const detail = details[0];
            if (detail.item) {
                return this.capitalizePokemonName(detail.item.name);
            }
            if (detail.trigger?.name === 'level-up' && detail.min_level) {
                return `Lv ${detail.min_level}`;
            }
            if (detail.trigger?.name === 'trade') {
                return 'Trade';
            }
            if (detail.min_happiness) {
                return `Happiness ${detail.min_happiness}`;
            }
            return null;
        };
        
        // Find the current Pokemon in the tree
        const findCurrentNode = (node: ChainLink, ancestors: ChainLink[] = []): { found: ChainLink, ancestors: ChainLink[] } | null => {
            if (node.species.name === currentPokemonName) {
                return { found: node, ancestors };
            }
            
            for (const evolution of node.evolves_to || []) {
                const result = findCurrentNode(evolution, [...ancestors, node]);
                if (result) return result;
            }
            
            return null;
        };
        
        // Recursively collect all evolutions from a node
        const collectEvolutions = (node: ChainLink): void => {
            if (!node.evolves_to || node.evolves_to.length === 0) return;
            
            for (const evo of node.evolves_to) {
                evolutions.push({
                    species: this.capitalizePokemonName(evo.species.name),
                    evolutionLevel: evo.evolution_details[0]?.min_level || null,
                    evolutionMethod: getEvolutionMethod(evo.evolution_details)
                });
                
                // Recursively get further evolutions
                collectEvolutions(evo);
            }
        };
        
        const result = findCurrentNode(chain.chain);
        
        if (result) {
            // Add all ancestors as pre-evolutions
            for (const ancestor of result.ancestors) {
                preevolutions.push({
                    species: this.capitalizePokemonName(ancestor.species.name),
                    evolutionLevel: null,
                    evolutionMethod: null
                });
            }
            
            // Collect all evolutions (including branching and further stages)
            collectEvolutions(result.found);
        }
        
        return { evolutions, preevolutions };
    }

    async getGenerationData(generationId: number): Promise<GenerationData | null> {
        try {
            const generation = await this.pokedex.generation.searchById(generationId);
            return {
                id: generation.id,
                name: generation.name,
                main_region: generation.main_region,
                pokemon_species: generation.pokemon_species
            };
        } catch (error) {
            console.error(`Error fetching generation ${generationId}:`, error);
            return null;
        }
    }

    async getPokemonByGeneration(generationId: number): Promise<string[]> {
        try {
            const generation = await this.getGenerationData(generationId);
            return generation?.pokemon_species.map(p => p.name) || [];
        } catch (error) {
            console.error(`Error fetching Pokemon by generation ${generationId}:`, error);
            return [];
        }
    }

    async getLocationAreas(locationName?: string): Promise<any[]> {
        try {
            if (locationName) {
                const locationResponse = await fetch(`https://pokeapi.co/api/v2/location/${locationName.toLowerCase()}/`);
                const location = await locationResponse.json();
                return location.areas || [];
            }
            // If no specific location, return a list of common locations
            const locations = ['kanto-route-1', 'johto-route-29', 'hoenn-route-101', 'sinnoh-route-201'];
            const locationData = [];
            
            for (const loc of locations) {
                try {
                    const locationResponse = await fetch(`https://pokeapi.co/api/v2/location/${loc}/`);
                    const location = await locationResponse.json();
                    locationData.push(location);
                } catch (err) {
                    console.warn(`Failed to fetch location: ${loc}`);
                }
            }
            
            return locationData;
        } catch (error) {
            console.error('Error fetching locations:', error);
            return [];
        }
    }

    private async getLocalizedFlavorTexts(flavorTextEntries: FlavorText[]): Promise<PokemonFlavorText[]> {
        let currentLang: string;
        try {
            currentLang = await getCurrentLanguage();
        } catch (error) {
            console.warn('Failed to get current language, using default:', error);
            currentLang = 'pl'; // fallback
        }
        const langCode = this.getPokeApiLanguageCode(currentLang);
        
        // Filter flavor texts by current language first
        let filteredEntries = flavorTextEntries.filter((entry) => entry.language.name === langCode);
        
        // Fallback to English if no entries in current language
        if (filteredEntries.length === 0) {
            filteredEntries = flavorTextEntries.filter((entry) => entry.language.name === 'en');
        }
        
        // If still no entries, take any available
        if (filteredEntries.length === 0) {
            filteredEntries = flavorTextEntries.slice(0, 5); // Take first 5 as fallback
        }
        
        return filteredEntries.map((entry) => ({
            flavor: entry.flavor_text.replace(/\n|\f/g, ' '), // Clean up newlines and form feeds            
        }));
    }

    private getPokeApiLanguageCode(language: string): string {
        // Map our language codes to PokeAPI language codes
        const languageMap: Record<string, string> = {
            'en': 'en',
            'pl': 'pl', // Polish is supported by PokeAPI
        };
        
        return languageMap[language] || 'en';
    }

}

// Export both default singleton and instance type for DI
export default PokemonDataService.getSingleton();
export { PokemonDataService as PokemonDataServiceInstance };

import { RWSService, RWSInject } from '@rws-framework/client';
import Pokedex from '@sherwinski/pokeapi-ts';
import HtmlFormattingService, { HtmlFormattingServiceInstance } from './html-formatting.service';
import { getCurrentLanguage } from '../translations/trans';

interface PokemonLocationData {
    locationAreas: {
        name: string;
        url: string;
        encounters: any[];
    }[];
}

interface GenerationData {
    id: number;
    name: string;
    main_region: {
        name: string;
        url: string;
    };
    pokemon_species: {
        name: string;
        url: string;
    }[];
}

export class PokemonDataService extends RWSService {
    private pokedex: Pokedex;

    constructor(
        @HtmlFormattingService private htmlFormattingService: HtmlFormattingServiceInstance
    ) {
        super();
        this.pokedex = new Pokedex();
    }

    async getPokemonData(pokemonName: string): Promise<any> {
        try {
            let pokemon = null;
            
            // Try to get Pokemon data using SDK
            try {
                pokemon = await this.pokedex.pokemon.searchByName(pokemonName.toLowerCase());
            } catch (error) {
                console.warn(`Failed to find Pokemon by name: ${pokemonName}, trying by ID...`);
                
                // If name search fails, try to parse as ID or use direct API call as fallback
                const pokemonId = parseInt(pokemonName);
                if (!isNaN(pokemonId)) {
                    pokemon = await this.pokedex.pokemon.searchById(pokemonId);
                } else {
                    // Last resort: direct API call
                    pokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}/`).then(res => res.json());
                }
            }
            
            if (!pokemon) {
                return null;
            }

            // Get species data for additional info
            const speciesUrl = pokemon.species.url;
            const speciesId = speciesUrl.split('/').slice(-2, -1)[0];
            const species = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`).then(res => res.json());
            
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
            const encounters = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`).then(res => res.json());
            const locationAreas = [];
            
            for (const encounter of encounters.slice(0, 10)) { // Limit to 10 locations
                try {
                    const locationArea = await fetch(encounter.location_area.url).then(res => res.json());
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

    private async transformPokemonData(pokemon: any, species: any, locationData: PokemonLocationData): Promise<any> {
        // Transform PokeAPI data to match expected format
        const abilities = {
            first: pokemon.abilities[0] ? {
                name: pokemon.abilities[0].ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities[0].ability.name)
            } : null,
            second: pokemon.abilities[1] && !pokemon.abilities[1].is_hidden ? {
                name: pokemon.abilities[1].ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities[1].ability.name)
            } : null,
            hidden: pokemon.abilities.find((a: any) => a.is_hidden) ? {
                name: pokemon.abilities.find((a: any) => a.is_hidden).ability.name,
                desc: await this.getAbilityDescription(pokemon.abilities.find((a: any) => a.is_hidden).ability.name)
            } : null
        };

        // Get evolution chain if available
        let evolutions = [];
        let preevolutions = [];
        if (species?.evolution_chain?.url) {
            try {
                const evolutionChainId = species.evolution_chain.url.split('/').slice(-2, -1)[0];
                const evolutionData = await fetch(`https://pokeapi.co/api/v2/evolution-chain/${evolutionChainId}/`).then(res => res.json());
                const evolutionInfo = this.parseEvolutionChain(evolutionData, pokemon.name);
                evolutions = evolutionInfo.evolutions;
                preevolutions = evolutionInfo.preevolutions;
            } catch (err) {
                console.warn('Failed to fetch evolution data');
            }
        }

        return {
            num: pokemon.id,
            species: pokemon.species.name,
            types: pokemon.types.map((t: any) => ({ name: t.type.name })),
            height: pokemon.height / 10, // Convert to meters
            weight: pokemon.weight / 10, // Convert to kg
            baseStats: {
                hp: pokemon.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
                attack: pokemon.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
                defense: pokemon.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
                specialattack: pokemon.stats.find((s: any) => s.stat.name === 'special-attack')?.base_stat || 0,
                specialdefense: pokemon.stats.find((s: any) => s.stat.name === 'special-defense')?.base_stat || 0,
                speed: pokemon.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 0
            },
            abilities,
            color: species?.color?.name || 'unknown',
            eggGroups: species?.egg_groups?.map((g: any) => g.name) || [],
            evolutionLevel: null, // Would need more complex logic
            evolutions,
            preevolutions,
            flavorTexts: this.getLocalizedFlavorTexts(species?.flavor_text_entries || []),
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
            locations: locationData.locationAreas
        };
    }

    private async getAbilityDescription(abilityName: string): Promise<string> {
        try {
            const ability = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}/`).then(res => res.json());
            const currentLang = getCurrentLanguage();
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

    private parseEvolutionChain(chain: any, currentPokemonName: string): { evolutions: any[], preevolutions: any[] } {
        const evolutions: any[] = [];
        const preevolutions: any[] = [];
        
        const traverseChain = (node: any, isPreEvolution = false) => {
            if (node.species.name === currentPokemonName) {
                // Found current Pokemon, everything after this is evolution
                node.evolves_to?.forEach((evo: any) => {
                    evolutions.push({
                        species: evo.species.name,
                        evolutionLevel: evo.evolution_details[0]?.min_level || null
                    });
                    traverseChain(evo, false);
                });
            } else if (isPreEvolution) {
                preevolutions.push({
                    species: node.species.name,
                    evolutionLevel: null
                });
            }
            
            // Check if current Pokemon is in the evolves_to
            node.evolves_to?.forEach((evo: any) => {
                if (evo.species.name === currentPokemonName) {
                    // Current node is a pre-evolution
                    preevolutions.push({
                        species: node.species.name,
                        evolutionLevel: null
                    });
                } else {
                    traverseChain(evo, false);
                }
            });
        };
        
        traverseChain(chain.chain, true);
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
                const location = await fetch(`https://pokeapi.co/api/v2/location/${locationName.toLowerCase()}/`).then(res => res.json());
                return location.areas || [];
            }
            // If no specific location, return a list of common locations
            const locations = ['kanto-route-1', 'johto-route-29', 'hoenn-route-101', 'sinnoh-route-201'];
            const locationData = [];
            
            for (const loc of locations) {
                try {
                    const location = await fetch(`https://pokeapi.co/api/v2/location/${loc}/`).then(res => res.json());
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

    formatPokemonDataToHTML(pokemon: any, language: string = 'pl'): string {
        return this.htmlFormattingService.formatPokemonDataToHTML(pokemon, language);
    }

    private getLocalizedFlavorTexts(flavorTextEntries: any[]): any[] {
        const currentLang = getCurrentLanguage();
        const langCode = this.getPokeApiLanguageCode(currentLang);
        
        // Filter flavor texts by current language first
        let filteredEntries = flavorTextEntries.filter((entry: any) => entry.language.name === langCode);
        
        // Fallback to English if no entries in current language
        if (filteredEntries.length === 0) {
            filteredEntries = flavorTextEntries.filter((entry: any) => entry.language.name === 'en');
        }
        
        // If still no entries, take any available
        if (filteredEntries.length === 0) {
            filteredEntries = flavorTextEntries.slice(0, 5); // Take first 5 as fallback
        }
        
        return filteredEntries.map((entry: any) => ({
            flavor: entry.flavor_text.replace(/\n|\f/g, ' '), // Clean up newlines and form feeds
            game: entry.version.name
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
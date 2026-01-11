import { RWSService, RWSInject } from '@rws-framework/client';
import type { Query, QueryGetPokemonArgs, QueryGetFuzzyPokemonArgs } from '@favware/graphql-pokemon';
import HtmlFormattingService, { HtmlFormattingServiceInstance } from './html-formatting.service';

interface GraphQLPokemonResponse<K extends keyof Omit<Query, '__typename'>> {
    data: Record<K, Omit<Query[K], '__typename'>>;
}

export class PokemonDataService extends RWSService {
    private readonly apiUrl = 'https://graphqlpokemon.favware.tech/v8';

    constructor(
        @HtmlFormattingService private htmlFormattingService: HtmlFormattingServiceInstance
    ) {
        super();
    }

    async getPokemonData(pokemonName: string): Promise<any> {
        try {
            // First try exact match
            let data = await this.queryPokemon(pokemonName);
            
            // If no exact match, try fuzzy search
            if (!data) {
                data = await this.queryFuzzyPokemon(pokemonName);
            }

            if (!data) {
                return null;
            }

            return data;

        } catch (error) {
            console.error(`❌ Error fetching Pokemon data for ${pokemonName}:`, error);
            return null;
        }
    }

    private async queryPokemon(pokemon: string): Promise<any> {
        const query = `
            query getPokemon($pokemon: PokemonEnum!) {
                getPokemon(pokemon: $pokemon) {
                    num
                    species
                    types {
                        name
                    }
                    height
                    weight
                    baseStats {
                        hp
                        attack
                        defense
                        specialattack
                        specialdefense
                        speed
                    }
                    abilities {
                        first {
                            name
                            desc
                        }
                        second {
                            name
                            desc
                        }
                        hidden {
                            name
                            desc
                        }
                    }
                    color
                    eggGroups
                    evolutionLevel
                    evolutions {
                        species
                        evolutionLevel
                    }
                    preevolutions {
                        species
                        evolutionLevel
                    }
                    flavorTexts {
                        flavor
                        game
                    }
                    sprite
                    shinySprite
                    legendary
                    mythical
                    catchRate {
                        base
                        percentageWithOrdinaryPokeballAtFullHealth
                    }
                    gender {
                        male
                        female
                    }
                }
            }
        `;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables: { pokemon: pokemon.toUpperCase() }
                })
            });

            const result = await response.json() as GraphQLPokemonResponse<'getPokemon'>;
            
            if (result.data?.getPokemon) {
                return result.data.getPokemon;
            }
            
            return null;
        } catch (error) {
            console.error('Error in exact Pokemon query:', error);
            return null;
        }
    }

    private async queryFuzzyPokemon(pokemon: string): Promise<any> {
        const query = `
            query getFuzzyPokemon($pokemon: String!) {
                getFuzzyPokemon(pokemon: $pokemon) {
                    num
                    species
                    types {
                        name
                    }
                    height
                    weight
                    baseStats {
                        hp
                        attack
                        defense
                        specialattack
                        specialdefense
                        speed
                    }
                    abilities {
                        first {
                            name
                            desc
                        }
                        second {
                            name
                            desc
                        }
                        hidden {
                            name
                            desc
                        }
                    }
                    color
                    eggGroups
                    evolutionLevel
                    evolutions {
                        species
                        evolutionLevel
                    }
                    preevolutions {
                        species
                        evolutionLevel
                    }
                    flavorTexts {
                        flavor
                        game
                    }
                    sprite
                    shinySprite
                    legendary
                    mythical
                    catchRate {
                        base
                        percentageWithOrdinaryPokeballAtFullHealth
                    }
                    gender {
                        male
                        female
                    }
                }
            }
        `;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables: { pokemon }
                })
            });

            const result = await response.json() as GraphQLPokemonResponse<'getFuzzyPokemon'>;
            
            if (result.data?.getFuzzyPokemon && Array.isArray(result.data.getFuzzyPokemon) && result.data.getFuzzyPokemon.length > 0) {
                return result.data.getFuzzyPokemon[0]; // Take the first match
            }
            
            return null;
        } catch (error) {
            console.error('Error in fuzzy Pokemon query:', error);
            return null;
        }
    }

    formatPokemonDataToHTML(pokemon: any, language: string = 'pl'): string {
        return this.htmlFormattingService.formatPokemonDataToHTML(pokemon, language);
    }

}

// Export both default singleton and instance type for DI
export default PokemonDataService.getSingleton();
export { PokemonDataService as PokemonDataServiceInstance };
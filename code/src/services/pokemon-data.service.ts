import { RWSService } from '@rws-framework/client';
import type { Query, QueryGetPokemonArgs, QueryGetFuzzyPokemonArgs } from '@favware/graphql-pokemon';

interface GraphQLPokemonResponse<K extends keyof Omit<Query, '__typename'>> {
    data: Record<K, Omit<Query[K], '__typename'>>;
}

export class PokemonDataService extends RWSService {
    private readonly apiUrl = 'https://graphqlpokemon.favware.tech/v8';

    constructor() {
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
            
            if (result.data?.getFuzzyPokemon) {
                return result.data.getFuzzyPokemon;
            }
            
            return null;
        } catch (error) {
            console.error('Error in fuzzy Pokemon query:', error);
            return null;
        }
    }

    getTypeColor(type: string): string {
        const typeColors: Record<string, string> = {
            'normal': '#A8A878',
            'fire': '#F08030',
            'water': '#6890F0',
            'electric': '#F8D030',
            'grass': '#78C850',
            'ice': '#98D8D8',
            'fighting': '#C03028',
            'poison': '#A040A0',
            'ground': '#E0C068',
            'flying': '#A890F0',
            'psychic': '#F85888',
            'bug': '#A8B820',
            'rock': '#B8A038',
            'ghost': '#705898',
            'dragon': '#7038F8',
            'dark': '#705848',
            'steel': '#B8B8D0',
            'fairy': '#EE99AC',
        };
        return typeColors[type.toLowerCase()] || '#68A090';
    }

    getTypeEffectiveness(): Record<string, { strong: string[], weak: string[] }> {
        return {
            'fire': {
                strong: ['grass', 'ice', 'bug', 'steel'],
                weak: ['fire', 'water', 'rock', 'dragon']
            },
            'water': {
                strong: ['fire', 'ground', 'rock'],
                weak: ['water', 'grass', 'dragon']
            },
            'grass': {
                strong: ['water', 'ground', 'rock'],
                weak: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel']
            },
            'electric': {
                strong: ['water', 'flying'],
                weak: ['electric', 'grass', 'ground', 'dragon']
            },
            'ice': {
                strong: ['grass', 'ground', 'flying', 'dragon'],
                weak: ['fire', 'water', 'ice', 'steel']
            },
            'fighting': {
                strong: ['normal', 'ice', 'rock', 'dark', 'steel'],
                weak: ['poison', 'flying', 'psychic', 'bug', 'fairy']
            },
            'poison': {
                strong: ['grass', 'fairy'],
                weak: ['poison', 'ground', 'rock', 'ghost']
            },
            'ground': {
                strong: ['fire', 'electric', 'poison', 'rock', 'steel'],
                weak: ['grass', 'bug']
            },
            'flying': {
                strong: ['electric', 'ice', 'rock'],
                weak: ['electric', 'rock', 'steel']
            },
            'psychic': {
                strong: ['fighting', 'poison'],
                weak: ['psychic', 'steel']
            },
            'bug': {
                strong: ['grass', 'psychic', 'dark'],
                weak: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy']
            },
            'rock': {
                strong: ['fire', 'ice', 'flying', 'bug'],
                weak: ['fighting', 'ground', 'steel']
            },
            'ghost': {
                strong: ['psychic', 'ghost'],
                weak: ['dark']
            },
            'dragon': {
                strong: ['dragon'],
                weak: ['steel']
            },
            'dark': {
                strong: ['fighting', 'dark', 'fairy'],
                weak: ['fighting', 'dark', 'fairy']
            },
            'steel': {
                strong: ['ice', 'rock', 'fairy'],
                weak: ['fire', 'water', 'electric', 'steel']
            },
            'fairy': {
                strong: ['fire', 'poison', 'steel'],
                weak: ['poison', 'steel']
            },
            'normal': {
                strong: [],
                weak: ['rock', 'ghost', 'steel']
            }
        };
    }

    formatPokemonDataToHTML(pokemon: any, language: string = 'pl'): string {
        if (!pokemon) {
            return `
                <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 10px;">
                    <h3 style="color: #856404;">🤖 Nie znaleziono Pokémona!</h3>
                    <p>Spróbuj wpisać inną nazwę Pokémona. 🔍✨</p>
                </div>
            `;
        }

        const types = pokemon.types?.map((t: any) => t.name) || [];
        const typeColors = types.map((type: string) => this.getTypeColor(type));
        const effectiveness = this.getTypeEffectiveness();
        
        const allStrengths = new Set<string>();
        const allWeaknesses = new Set<string>();
        
        types.forEach((type: string) => {
            const eff = effectiveness[type.toLowerCase()];
            if (eff) {
                eff.strong.forEach(s => allStrengths.add(s));
                eff.weak.forEach(w => allWeaknesses.add(w));
            }
        });

        const flavorText = pokemon.flavorTexts?.[0]?.flavor || 'Brak opisu dostępnego.';
        const sprite = pokemon.sprite || '';
        const shinySprite = pokemon.shinySprite || '';

        return `
            <div class="pokemon-info">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <h2 style="color: #e74c3c; margin: 0;"><i class="fa fa-star"></i> ${pokemon.species}</h2>
                    <div style="display: flex; gap: 10px;">
                        ${sprite ? `<img src="${sprite}" alt="${pokemon.species}" style="width: 80px; height: 80px; image-rendering: pixelated;">` : ''}
                        ${shinySprite ? `<img src="${shinySprite}" alt="${pokemon.species} Shiny" style="width: 80px; height: 80px; image-rendering: pixelated; filter: brightness(1.2);">` : ''}
                    </div>
                </div>

                <div class="pokemon-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <p><strong style="color: #3498db;">🔢 Numer Pokedex:</strong> #${pokemon.num.toString().padStart(3, '0')}</p>
                        <p><strong style="color: #27ae60;">🏷️ Typ:</strong> ${types.map((type: string, i: number) => 
                            `<span style="background: ${typeColors[i]}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.9em;">${type}</span>`
                        ).join(' ')}</p>
                        <p><strong style="color: #f39c12;">📏 Wzrost:</strong> ${pokemon.height} m</p>
                        <p><strong style="color: #9b59b6;">⚖️ Waga:</strong> ${pokemon.weight} kg</p>
                    </div>
                    <div>
                        <p><strong style="color: #e67e22;">🎨 Kolor:</strong> ${pokemon.color}</p>
                        <p><strong style="color: #1abc9c;">⚡ Główna zdolność:</strong> ${pokemon.abilities?.first?.name || 'Brak'}</p>
                        ${pokemon.abilities?.hidden ? `<p><strong style="color: #34495e;">🔮 Ukryta zdolność:</strong> ${pokemon.abilities.hidden.name}</p>` : ''}
                    </div>
                </div>

                <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📊 Statystyki bazowe</h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>❤️ HP</strong><br>${pokemon.baseStats?.hp || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #feca57, #ff9ff3); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>⚔️ Atak</strong><br>${pokemon.baseStats?.attack || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #48dbfb, #0abde3); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>🛡️ Obrona</strong><br>${pokemon.baseStats?.defense || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #ff9ff3, #f368e0); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>✨ Sp.Atak</strong><br>${pokemon.baseStats?.specialattack || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #ff6348, #ff4757); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>🛡️ Sp.Obrona</strong><br>${pokemon.baseStats?.specialdefense || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #7bed9f, #70a1ff); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>💨 Szybkość</strong><br>${pokemon.baseStats?.speed || 0}
                    </div>
                </div>

                <h3 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 5px;">📖 Opis</h3>
                <p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #27ae60; border-radius: 5px; margin-bottom: 20px;">
                    ${flavorText}
                </p>

                ${(allStrengths.size > 0 || allWeaknesses.size > 0) ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${allStrengths.size > 0 ? `
                    <div>
                        <h4 style="color: #27ae60;">✅ Efektywny przeciwko:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${Array.from(allStrengths).map(type => 
                                `<span style="background: #d5f5d5; color: #27ae60; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${type}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                    ${allWeaknesses.size > 0 ? `
                    <div>
                        <h4 style="color: #e74c3c;">❌ Mało efektywny przeciwko:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${Array.from(allWeaknesses).map(type => 
                                `<span style="background: #fdd5d5; color: #e74c3c; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${type}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                </div>` : ''}

                ${(pokemon.evolutions?.length > 0 || pokemon.preevolutions?.length > 0) ? `
                <div style="margin-top: 20px;">
                    <h4 style="color: #f39c12;">⚔️ Łańcuch ewolucji:</h4>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                        ${pokemon.preevolutions?.map((pre: any) => `${pre.species}`).join(' → ') || ''}
                        ${pokemon.preevolutions?.length > 0 ? ' → ' : ''}<strong>${pokemon.species}</strong>
                        ${pokemon.evolutions?.length > 0 ? ' → ' : ''}${pokemon.evolutions?.map((evo: any) => `${evo.species}`).join(' → ') || ''}
                    </div>
                </div>` : ''}

                <div style="margin-top: 20px; background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #1976d2; margin-top: 0;">💡 Dodatkowe informacje:</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        ${pokemon.legendary ? '<span style="background: #ffeb3b; color: #f57f17; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">🏆 Legendarny</span>' : ''}
                        ${pokemon.mythical ? '<span style="background: #e1bee7; color: #7b1fa2; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">✨ Mityczny</span>' : ''}
                        ${pokemon.catchRate?.percentageWithOrdinaryPokeballAtFullHealth ? 
                            `<span style="background: #c8e6c9; color: #2e7d32; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">🎯 Łapalność: ${pokemon.catchRate.percentageWithOrdinaryPokeballAtFullHealth}%</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

// Export both default singleton and instance type for DI
export default PokemonDataService.getSingleton();
export { PokemonDataService as PokemonDataServiceInstance };
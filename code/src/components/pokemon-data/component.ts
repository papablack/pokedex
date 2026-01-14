import { RWSViewComponent, RWSView, observable, attr } from '@rws-framework/client';
import type { TransformedPokemonData } from '@front/types/pokemon-data.types';

@RWSView('pokemon-data')
export class PokemonData extends RWSViewComponent {
    @observable pokemonData: TransformedPokemonData | null = null;
    @attr language: string = 'pl';

    setPokemonData(data: TransformedPokemonData | null): void {
        this.pokemonData = data;
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

    getTypeEffectiveness(): { strongAgainst: string[], weakAgainst: string[] } {
        if (!this.pokemonData?.types || this.pokemonData.types.length === 0) {
            return { strongAgainst: [], weakAgainst: [] };
        }

        const typeEffectiveness: Record<string, { strong: string[], weak: string[] }> = {
            'fire': { strong: ['grass', 'ice', 'bug', 'steel'], weak: ['fire', 'water', 'rock', 'dragon'] },
            'water': { strong: ['fire', 'ground', 'rock'], weak: ['water', 'grass', 'dragon'] },
            'grass': { strong: ['water', 'ground', 'rock'], weak: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
            'electric': { strong: ['water', 'flying'], weak: ['electric', 'grass', 'ground', 'dragon'] },
            'ice': { strong: ['grass', 'ground', 'flying', 'dragon'], weak: ['fire', 'water', 'ice', 'steel'] },
            'fighting': { strong: ['normal', 'ice', 'rock', 'dark', 'steel'], weak: ['poison', 'flying', 'psychic', 'bug', 'fairy'] },
            'poison': { strong: ['grass', 'fairy'], weak: ['poison', 'ground', 'rock', 'ghost'] },
            'ground': { strong: ['fire', 'electric', 'poison', 'rock', 'steel'], weak: ['grass', 'bug'] },
            'flying': { strong: ['grass', 'fighting', 'bug'], weak: ['electric', 'rock', 'steel'] },
            'psychic': { strong: ['fighting', 'poison'], weak: ['psychic', 'steel'] },
            'bug': { strong: ['grass', 'psychic', 'dark'], weak: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
            'rock': { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['fighting', 'ground', 'steel'] },
            'ghost': { strong: ['psychic', 'ghost'], weak: ['dark'] },
            'dragon': { strong: ['dragon'], weak: ['steel'] },
            'dark': { strong: ['psychic', 'ghost'], weak: ['fighting', 'dark', 'fairy'] },
            'steel': { strong: ['ice', 'rock', 'fairy'], weak: ['fire', 'water', 'electric', 'steel'] },
            'fairy': { strong: ['fighting', 'dragon', 'dark'], weak: ['poison', 'steel'] },
            'normal': { strong: [], weak: ['rock', 'ghost', 'steel'] }
        };

        const allStrengths = new Set<string>();
        const allWeaknesses = new Set<string>();

        this.pokemonData.types.forEach(type => {
            const effectiveness = typeEffectiveness[type.name.toLowerCase()];
            if (effectiveness) {
                effectiveness.strong.forEach(t => allStrengths.add(t));
                effectiveness.weak.forEach(t => allWeaknesses.add(t));
            }
        });

        return {
            strongAgainst: Array.from(allStrengths),
            weakAgainst: Array.from(allWeaknesses)
        };
    }

    openBulbapedia(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.pokemonData?.species) return;
        
        const pokemonName = this.pokemonData.species.replace(/\s+/g, '_');
        const bulbapediaUrl = `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(pokemonName)}_(Pokémon)`;
        
        // Check if running in Electron
        if ((window as any).electronAPI?.isElectron) {
            // In Electron, use the exposed API to open external URLs in the system browser
            // This prevents the URL from opening in the Electron window
            (window as any).electronAPI.openExternal(bulbapediaUrl);
        } else {
            // In browser, open in new tab
            window.open(bulbapediaUrl, '_blank', 'noopener,noreferrer');
        }
    }
}

PokemonData.defineComponent();

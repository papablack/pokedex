import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-input')
export class PokedexInput extends RWSViewComponent {
    @observable isGenerating: boolean = false;
    searchInput: HTMLInputElement;

    constructor() {
        super();
    }

    handleSearch() {
        const query = this.searchInput?.value?.trim() || '';
        this.$emit('search', query);
    }

    quickSearch(pokemonName: string) {
        if (this.searchInput) {
            this.searchInput.value = pokemonName;
        }
        this.$emit('search', pokemonName);
    }
}

PokedexInput.defineComponent();
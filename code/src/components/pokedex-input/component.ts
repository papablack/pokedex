import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-input')
export class PokedexInput extends RWSViewComponent {
    @observable query: string = '';
    @observable isGenerating: boolean = false;
    @observable currentQuery: string = '';

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        this.currentQuery = this.query;
    }

    handleInput(event: InputEvent) {
        this.currentQuery = (event.target as HTMLInputElement).value;
    }

    handleKeypress(event: KeyboardEvent) {
        if (event.key === 'Enter' && !this.isGenerating) {
            this.handleSearch();
        }
    }

    handleSearch() {
        if (this.currentQuery.trim()) {
            this.$emit('search', this.currentQuery);
        }
    }

    quickSearch(pokemonName: string) {
        this.currentQuery = pokemonName;
        this.$emit('search', pokemonName);
    }
}

PokedexInput.defineComponent();
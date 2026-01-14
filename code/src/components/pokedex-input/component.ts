import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-input')
export class PokedexInput extends RWSViewComponent {
    @observable isGenerating: boolean = false;
    @observable canInterrupt: boolean = false;
    @observable hasConversation: boolean = false;
    searchInput: HTMLInputElement;

    constructor() {
        super();
    }

    handleSearch() {
        const query = this.searchInput?.value?.trim() || '';
        if (query) {
            this.$emit('search', query);
            // Clear input after successful submission
            if (this.searchInput) {
                this.searchInput.value = '';
            }
        }
    }

    handleInterrupt() {
        console.log('🔴 PokedexInput: Interrupt button clicked');
        this.$emit('interrupt');
    }

    handleStop() {
        console.log('🛑 PokedexInput: Stop button clicked');
        this.$emit('stop-streaming');
    }

    handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleKeyUp(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    }

    quickSearch(pokemonName: string) {
        if (this.searchInput) {
            this.searchInput.value = pokemonName;
        }
        this.$emit('search', pokemonName);
    }
}

PokedexInput.defineComponent();

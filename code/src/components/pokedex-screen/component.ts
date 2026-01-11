import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-screen')
export class PokedexScreen extends RWSViewComponent {
    @observable output: string = '';
    @observable isGenerating: boolean = false;

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
    }

    get defaultContent(): string {
        return `<div class="welcome-message">
            <div class="title">${'pokedex.title'.t()}</div>
            <div class="subtitle">${'pokedex.welcome'.t()}</div>
            <div class="instructions">${'pokedex.instructions'.t()}</div>
            <hr>
            <div class="instructions">${'pokedex.configureFirst'.t()}</div>
        </div>`;
    }
}

PokedexScreen.defineComponent();
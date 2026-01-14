import { RWSViewComponent, RWSView, observable, attr } from '@rws-framework/client';

@RWSView('poke-tag')
export class PokeTag extends RWSViewComponent {
    @attr type: string = '';

    constructor() {
        super();
    }
}

PokeTag.defineComponent();
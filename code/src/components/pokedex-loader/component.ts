import { RWSViewComponent, RWSView, observable, attr } from '@rws-framework/client';

@RWSView('pokeball-loader')
export class PokeballLoader extends RWSViewComponent {    
    constructor() {
        super();
    }
}

PokeballLoader.defineComponent();
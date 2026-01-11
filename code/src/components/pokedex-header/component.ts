import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-header')
export class PokedexHeader extends RWSViewComponent {
    @observable connected: boolean = false;
    @observable pokemonData: any = null;
    @observable rightWingVisible: boolean = false;

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
    }

    handleSettingsClick() {
        this.$emit('toggle-settings');
    }

    handleWingToggle() {
        this.$emit('toggle-wing');
    }

    get connectionStatus() {
        return this.connected ? 'connected' : 'disconnected';
    }

    get statusBadgeClass() {
        return this.connected ? 'connected' : 'disconnected';
    }
}

PokedexHeader.defineComponent();
import { RWSClientInstance } from '@rws-framework/client';
import { HomePage } from '../pages/home/component';
import { PokedexMain } from '../components/pokedex-main/component';
import { PokedexSettings } from '../components/pokedex-settings/component';
import { PokedexHeader } from '../components/pokedex-header/component';
import { PokedexScreen } from '../components/pokedex-screen/component';
import { PokedexInput } from '../components/pokedex-input/component';


export default (parted: boolean): void => {
    HomePage;
    PokedexMain;
    PokedexSettings;
    PokedexHeader;
    PokedexScreen;
    PokedexInput;

    RWSClientInstance.defineAllComponents();
};
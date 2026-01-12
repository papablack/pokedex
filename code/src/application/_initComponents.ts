import { RWSClientInstance } from '@rws-framework/client';
import { declareRWSComponents } from '@rws-framework/components';
import { HomePage } from '../pages/home/component';
import { DefaultLayout } from '../layouts/default-layout/component';
import { PokedexMain } from '../components/pokedex-main/component';
import { PokedexSettings } from '../components/pokedex-settings/component';
import { PokedexHeader } from '../components/pokedex-header/component';
import { PokedexScreen } from '../components/pokedex-screen/component';
import { PokedexInput } from '../components/pokedex-input/component';


export default (parted: boolean): void => {
    // Initialize RWS components including the modal
    declareRWSComponents(parted);
    
    HomePage;
    DefaultLayout;
    PokedexMain;
    PokedexSettings;
    PokedexHeader;
    PokedexScreen;
    PokedexInput;

    RWSClientInstance.defineAllComponents();
};
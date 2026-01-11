import { getLanguage, setLanguage } from './application/globals/translations';

if(!getLanguage()) {
    setLanguage('pl'); 
}

import './application/globals/global-extensions';
import RWSClient, { RWSContainer, RWSClientInstance, RWSPlugin, RWSViewComponent, NotifyLogType, NotifyUiType, ConfigServiceInstance, ConfigService, ApiService, ApiServiceInstance } from '@rws-framework/client';
import { RWSBrowserRouter, BrowserRouterOpts  } from '@rws-framework/browser-router';
import initComponents from './application/_initComponents';
import routes, { frontRoutes } from './routes';

import './styles/main.scss';

import './application/globals/directives'

async function initializeApp() {
    const theClient: RWSClientInstance = RWSContainer().get(RWSClient);
    const configService: ConfigServiceInstance = RWSContainer().get(ConfigService);
  

    const partedMode = false;
    const lastSync = document.body.getAttribute('data-last-sync') || '0';    
   

    
    theClient.addPlugin<BrowserRouterOpts>(RWSBrowserRouter);

    theClient.assignClientToBrowser();             

    theClient.onInit(async () => {
        RWSPlugin.getPlugin<RWSBrowserRouter>(RWSBrowserRouter).addRoutes(routes);
        initComponents(partedMode);
    });    
    
    if(localStorage.getItem('_jwt')){
        theClient.apiService.setToken(localStorage.getItem('_jwt') as string);
    }    

    theClient.setNotifier((message: string, logType?: NotifyLogType) => {
       //here make som notifications message system
    });              
        
    
    await theClient.start({                
        hot: true,
        partedDirUrlPrefix: '/js',
        parted: partedMode
    });         
}

initializeApp().catch(console.error);

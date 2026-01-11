import { RWSViewComponent, RWSView, observable, RWSInject, RWSEvents, attr, ApiService, ApiServiceInstance } from '@rws-framework/client';

import { RouterComponent, _ROUTING_EVENT_NAME, IRoutingEvent } from '@rws-framework/browser-router';
RouterComponent;

import { listenRouter } from './listeners/router';
import { listenNotify } from './listeners/notify';
import { NotifyType } from '@front/types/app.types';

@RWSView('default-layout', { ignorePackaging: true })
class DefaultLayout extends RWSViewComponent {
    @attr frontRoute: string;

    @observable currentPage: string;
    @observable notifications: NotifyType[] = [];


    async connectedCallback(): Promise<void> {
        super.connectedCallback();

    


        listenRouter.bind(this)();
        listenNotify.bind(this)();       
    }
}

DefaultLayout.defineComponent();

export { DefaultLayout };
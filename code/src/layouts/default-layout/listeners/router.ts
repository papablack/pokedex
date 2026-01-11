import { _ROUTING_EVENT_NAME, IRoutingEvent } from "@rws-framework/browser-router";
import { DefaultLayout } from "../component";

export function listenRouter(this: DefaultLayout){
    this.on<IRoutingEvent>(_ROUTING_EVENT_NAME, (event) => {
        this.currentPage = event.detail.routeName;
    });

    this.on<{ item: string }>('routing.url.changed', (event) => {
        const url = event.detail.item;
        this.currentUrl = url;
    });
    
    // Set initial URL from browser
    if (typeof window !== 'undefined') {
        this.currentUrl = window.location.pathname + window.location.search;
        
        // Listen for browser navigation
        window.addEventListener('popstate', () => {
            this.currentUrl = window.location.pathname + window.location.search;
        });
    }
}
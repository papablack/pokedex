import { _ROUTING_EVENT_NAME, IRoutingEvent } from "@rws-framework/browser-router";
import { DefaultLayout } from "../component";

export function listenRouter(this: DefaultLayout){
    this.$emit(_ROUTING_EVENT_NAME, (route_event: IRoutingEvent) => {
        this.currentPage = route_event.routeName;
    });

    this.on<{ item: string }>('routing.url.changed', (event) => {
        const url = event.detail.item;
        
        this.currentUrl = url;
    });
}
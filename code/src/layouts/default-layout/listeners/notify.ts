import { _ROUTING_EVENT_NAME, IRoutingEvent } from "@rws-framework/browser-router";
import { DefaultLayout } from "../component";
import { appEvents } from "@front/event/events";
import { NotifyType } from "@front/types/app.types";

export function listenNotify(this: DefaultLayout){
    this.on<{ index: number }>(appEvents.removeNotify, (event) => {
        this.notifications = this.notifications.filter((item, itemIndex) => itemIndex !== event.detail.index);
    });

    this.on<{ id: string }>(appEvents.removeNotifyById, (event) => {
        this.notifications = this.notifications.filter((item, itemIndex) => item.id !== event.detail.id);
    });

    this.on<NotifyType>(appEvents.notify, (event) => {
        this.notifications = [...this.notifications, event.detail]
    });
}
import RWSClient, { RWSClientInstance, RWSContainer } from "@rws-framework/client";
import { getLanguage } from "./translations";
import { translate } from "../../translations/trans";

String.prototype.capitalize = function(this: string): string {
    if (!this || this.length === 0) return '';
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

String.prototype.t = function(this: string): string {
    return translate(this, getLanguage() || 'en');
};

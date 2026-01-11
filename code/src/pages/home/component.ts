import { RWSViewComponent, RWSView, observable } from "@rws-framework/client";

@RWSView('page-home', { debugPackaging: false })
class HomePage extends RWSViewComponent {    

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();                      
    }    
}

HomePage.defineComponent();

export { HomePage }
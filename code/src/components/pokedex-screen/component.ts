import { RWSViewComponent, RWSView, observable } from '@rws-framework/client';

@RWSView('pokedex-screen')
export class PokedexScreen extends RWSViewComponent {
    @observable output: string = '';
    @observable isGenerating: boolean = false;
    @observable contentReady: boolean = false;
    private autoScrollEnabled: boolean = true;
    private screenContent: HTMLElement | null = null;

    constructor() {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Setup scroll listener after DOM is ready
        setTimeout(() => {
            this.screenContent = this.shadowRoot?.querySelector('.screen-content') as HTMLElement;
            if (this.screenContent) {
                this.screenContent.addEventListener('scroll', this.handleScroll.bind(this));
            }
        }, 100);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.screenContent) {
            this.screenContent.removeEventListener('scroll', this.handleScroll.bind(this));
        }
    }

    outputChanged(oldValue: string, newValue: string) {
        // Auto-scroll to bottom when new content is added (only if enabled)
        if (newValue && newValue !== oldValue && this.autoScrollEnabled) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                this.scrollToBottom();
            }, 10);
        }
    }

    private handleScroll() {
        if (!this.screenContent) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.screenContent;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
        
        // Disable auto-scroll if user scrolls up
        if (!isAtBottom && this.autoScrollEnabled) {
            this.autoScrollEnabled = false;
        }
        // Re-enable auto-scroll if user scrolls back to bottom
        else if (isAtBottom && !this.autoScrollEnabled) {
            this.autoScrollEnabled = true;
        }
    }

    isGeneratingChanged(oldValue: boolean, newValue: boolean) {
        // Re-enable auto-scroll when new generation starts
        if (newValue && !oldValue) {
            this.autoScrollEnabled = true;
        }
    }

    private scrollToBottom() {
        if (this.screenContent) {
            this.screenContent.scrollTop = this.screenContent.scrollHeight;
        }
    }

    get defaultContent(): string {
        return `<div class="welcome-message">
            <div class="title">${'pokedex.title'.t()}</div>
            <div class="subtitle">${'pokedex.welcome'.t()}</div>
            <div class="instructions">${'pokedex.instructions'.t()}</div>
            <hr>
            <div class="instructions">${'pokedex.configureFirst'.t()}</div>
        </div>`;
    }
}

PokedexScreen.defineComponent();
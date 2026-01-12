import { RWSViewComponent, RWSView, observable, RWSInject } from '@rws-framework/client';
import PokemonDataService, { PokemonDataServiceInstance } from '@front/services/pokemon-data.service';
import PokedexSettingsService, { PokedexSettingsServiceInstance } from '@front/services/pokedex-settings.service';
import storageServiceInstance, { StorageServiceInstance } from '@front/services/storage.service';

@RWSView('pokedex-screen')
export class PokedexScreen extends RWSViewComponent {
    @observable output: string = '';
    @observable isGenerating: boolean = false;
    @observable contentReady: boolean = false;
    @observable selectedGeneration: number | null = null;
    @observable selectedLocation: string | null = null;
    @observable generations: any[] = [];
    @observable locations: any[] = [];
    @observable filteredPokemonList: string[] = [];
    @observable showFilters: boolean = false;
    
    private autoScrollEnabled: boolean = true;
    private screenContent: HTMLElement | null = null;

    constructor(
        @PokemonDataService private pokemonDataService: PokemonDataServiceInstance,
        @PokedexSettingsService private settingsService: PokedexSettingsServiceInstance,
        @RWSInject(storageServiceInstance) private storageService: StorageServiceInstance
    ) {
        super();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        // Setup scroll listener after DOM is ready
        setTimeout(() => {
            this.screenContent = this.shadowRoot?.querySelector('.screen-content') as HTMLElement;
            if (this.screenContent) {
                this.screenContent.addEventListener('scroll', this.handleScroll.bind(this));
                this.setupEventListeners();
            }
        }, 100);

        // Initialize generation and location data
        await this.initializeFilterData();
        
        // Load previously selected generation
        const rememberedGeneration = await this.loadSelectedGeneration();
        if (rememberedGeneration) {
            this.selectedGeneration = rememberedGeneration;
            this.showFilters = true; // Show filters if generation is remembered
            // Load filtered content for remembered generation
            if (this.pokemonDataService && typeof this.pokemonDataService.getPokemonByGeneration === 'function') {
                this.filteredPokemonList = await this.pokemonDataService.getPokemonByGeneration(rememberedGeneration);
                this.updateFilteredContent();
            }
        }
    }

    private setupEventListeners() {
        if (!this.screenContent) return;

        this.screenContent.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            const action = target.getAttribute('data-action');

            if (action === 'toggle-filters') {
                this.toggleFilters();
            } else if (action === 'select-generation') {
                const generationId = parseInt(target.getAttribute('data-generation') || '0');
                if (generationId) {
                    await this.selectGeneration(generationId);
                }
            } else if (action === 'clear-filters') {
                await this.clearFilters();
            } else if (action === 'request-pokemon') {
                const pokemonName = target.getAttribute('data-pokemon');
                if (pokemonName) {
                    this.requestPokemonData(pokemonName);
                }
            }
        });
    }

    private async initializeFilterData() {
        try {
            // Initialize generations (1-9 as of Gen 9)
            this.generations = [
                { id: 1, name: 'generation-i', displayName: 'Generation I (Kanto)' },
                { id: 2, name: 'generation-ii', displayName: 'Generation II (Johto)' },
                { id: 3, name: 'generation-iii', displayName: 'Generation III (Hoenn)' },
                { id: 4, name: 'generation-iv', displayName: 'Generation IV (Sinnoh)' },
                { id: 5, name: 'generation-v', displayName: 'Generation V (Unova)' },
                { id: 6, name: 'generation-vi', displayName: 'Generation VI (Kalos)' },
                { id: 7, name: 'generation-vii', displayName: 'Generation VII (Alola)' },
                { id: 8, name: 'generation-viii', displayName: 'Generation VIII (Galar)' },
                { id: 9, name: 'generation-ix', displayName: 'Generation IX (Paldea)' }
            ];

            // Load common locations
            if (this.pokemonDataService && typeof this.pokemonDataService.getLocationAreas === 'function') {
                this.locations = await this.pokemonDataService.getLocationAreas();
            }
        } catch (error) {
            console.error('Failed to initialize filter data:', error);
        }
    }

    toggleFilters() {
        this.showFilters = !this.showFilters;
    }

    async selectGeneration(generationId: number) {
        this.selectedGeneration = generationId;
        await this.saveSelectedGeneration(generationId);
        if (this.pokemonDataService && typeof this.pokemonDataService.getPokemonByGeneration === 'function') {
            this.filteredPokemonList = await this.pokemonDataService.getPokemonByGeneration(generationId);
        }
        this.updateFilteredContent();
    }

    async selectLocation(locationName: string) {
        this.selectedLocation = locationName;
        // Location filtering would require more complex logic
        this.updateFilteredContent();
    }

    async clearFilters() {
        this.selectedGeneration = null;
        this.selectedLocation = null;
        this.filteredPokemonList = [];
        await this.saveSelectedGeneration(null);
        this.showFilters = false; // Hide filters when clearing
        
        // Clear the filtered content and show default content
        this.output = '';
        this.contentReady = true;
    }

    private updateFilteredContent() {
        if (this.filteredPokemonList.length > 0) {
            const content = this.generateFilteredContent();
            this.output = content;
            this.contentReady = true;
        }
    }

    private generateFilteredContent(): string {
        const generationName = this.generations.find(g => g.id === this.selectedGeneration)?.displayName || '';
        
        return `
            <div class="filtered-results">
                <h3 style="color: #e74c3c; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    🎮 ${generationName}
                </h3>
                <p style="margin-bottom: 20px; color: #34495e;">
                    ${'pokedex.foundPokemon'.t()}: ${this.filteredPokemonList.length}
                </p>
                <div class="pokemon-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                    ${this.filteredPokemonList.map(pokemonName => `
                        <div class="pokemon-card" data-action="request-pokemon" data-pokemon="${pokemonName}" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 15px;
                            border-radius: 10px;
                            text-align: center;
                            cursor: pointer;
                            transition: transform 0.2s;
                            border: 2px solid #5a67d8;
                        ">
                            <h4 style="margin: 0; text-transform: capitalize;">${pokemonName}</h4>
                            <p style="margin: 5px 0 0; font-size: 1.25em; opacity: 0.9;">
                                ${'pokedex.clickToView'.t()}
                            </p>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button data-action="clear-filters" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        ${'pokedex.clearFilters'.t()}
                    </button>
                </div>
            </div>
        `;
    }

    requestPokemonData(pokemonName: string) {
        // Emit event to request Pokemon data
        this.$emit('request-pokemon', { pokemonName });
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
                this.setupEventListeners(); // Re-setup event listeners after content change
            }, 10);
        }
    }

    showFiltersChanged(oldValue: boolean, newValue: boolean) {
        // Refresh content when filters visibility changes
        this.contentReady = false;
        setTimeout(() => {
            this.contentReady = true;
            // If filters are shown and we have a selected generation, ensure filtered content is displayed
            if (newValue && this.selectedGeneration && this.filteredPokemonList.length > 0) {
                this.updateFilteredContent();
            }
        }, 10);
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
        // Check if we're in free mode
        // Note: This is a getter, so we'll use a fallback for now
        // In a real app, you might want to convert this to async or use a cached value
        let isFreeMode = true;
        let needsConfiguration = false;
        
        try {
            // Try to get settings synchronously if possible, otherwise use defaults
            const isConfigured = this.settingsService && this.settingsService.isConfigured();
            needsConfiguration = !isFreeMode && !isConfigured;
        } catch (error) {
            console.warn('Could not check settings in defaultContent:', error);
        }
        
        return `<div class="welcome-message">
            <div class="title">${'pokedex.title'.t()}</div>
            <div class="subtitle">${'pokedex.welcome'.t()}</div>
            <div class="instructions">${'pokedex.instructions'.t()}</div>
            
            <div style="margin: 20px 0; text-align: center;">
                <button data-action="toggle-filters" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 0 10px;
                    transition: transform 0.2s;
                ">
                    🔍 ${'pokedex.browseByGeneration'.t()}
                </button>
            </div>
            
            ${this.showFilters ? this.generateFiltersHTML() : ''}
            
            ${needsConfiguration ? `
                <hr>
                <div class="instructions">${'pokedex.configureFirst'.t()}</div>
            ` : ''}
        </div>`;
    }

    private generateFiltersHTML(): string {
        return `
            <div class="filter-panel" style="
                background: #f8f9fa;
                padding: 20px;
                border-radius: 15px;
                margin: 20px 0;
                border: 2px solid #e9ecef;
            ">
                <h3 style="color: #495057; margin-bottom: 15px;">
                    🎮 ${'pokedex.selectGeneration'.t()}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    ${this.generations.map(gen => `
                        <button data-generation="${gen.id}" data-action="select-generation" style="
                            background: ${this.selectedGeneration === gen.id ? '#28a745' : '#007bff'};
                            color: white;
                            border: none;
                            padding: 10px 15px;
                            border-radius: 20px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.2s;
                        ">
                            ${gen.displayName}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // StorageService methods for generation persistence
    private async saveSelectedGeneration(generationId: number | null) {
        try {
            if (generationId !== null) {
                await this.storageService.set('pokedex-selected-generation', generationId.toString());
            } else {
                await this.storageService.remove('pokedex-selected-generation');
            }
        } catch (error) {
            console.warn('Failed to save generation to storage:', error);
        }
    }

    private async loadSelectedGeneration(): Promise<number | null> {
        try {
            const saved = await this.storageService.get('pokedex-selected-generation');
            return saved ? parseInt(saved, 10) : null;
        } catch (error) {
            console.warn('Failed to load generation from storage:', error);
            return null;
        }
    }
}

PokedexScreen.defineComponent();
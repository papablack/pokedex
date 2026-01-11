import { RWSService } from '@rws-framework/client';

export class HtmlFormattingService extends RWSService {

    constructor() {
        super();
    }

    getTypeColor(type: string): string {
        const typeColors: Record<string, string> = {
            'normal': '#A8A878',
            'fire': '#F08030',
            'water': '#6890F0',
            'electric': '#F8D030',
            'grass': '#78C850',
            'ice': '#98D8D8',
            'fighting': '#C03028',
            'poison': '#A040A0',
            'ground': '#E0C068',
            'flying': '#A890F0',
            'psychic': '#F85888',
            'bug': '#A8B820',
            'rock': '#B8A038',
            'ghost': '#705898',
            'dragon': '#7038F8',
            'dark': '#705848',
            'steel': '#B8B8D0',
            'fairy': '#EE99AC',
        };
        return typeColors[type.toLowerCase()] || '#68A090';
    }

    getTypeEffectiveness(): Record<string, { strong: string[], weak: string[] }> {
        return {
            'fire': {
                strong: ['grass', 'ice', 'bug', 'steel'],
                weak: ['fire', 'water', 'rock', 'dragon']
            },
            'water': {
                strong: ['fire', 'ground', 'rock'],
                weak: ['water', 'grass', 'dragon']
            },
            'grass': {
                strong: ['water', 'ground', 'rock'],
                weak: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel']
            },
            'electric': {
                strong: ['water', 'flying'],
                weak: ['electric', 'grass', 'ground', 'dragon']
            },
            'ice': {
                strong: ['grass', 'ground', 'flying', 'dragon'],
                weak: ['fire', 'water', 'ice', 'steel']
            },
            'fighting': {
                strong: ['normal', 'ice', 'rock', 'dark', 'steel'],
                weak: ['poison', 'flying', 'psychic', 'bug', 'fairy']
            },
            'poison': {
                strong: ['grass', 'fairy'],
                weak: ['poison', 'ground', 'rock', 'ghost']
            },
            'ground': {
                strong: ['fire', 'electric', 'poison', 'rock', 'steel'],
                weak: ['grass', 'bug']
            },
            'flying': {
                strong: ['electric', 'ice', 'rock'],
                weak: ['electric', 'rock', 'steel']
            },
            'psychic': {
                strong: ['fighting', 'poison'],
                weak: ['psychic', 'steel']
            },
            'bug': {
                strong: ['grass', 'psychic', 'dark'],
                weak: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy']
            },
            'rock': {
                strong: ['fire', 'ice', 'flying', 'bug'],
                weak: ['fighting', 'ground', 'steel']
            },
            'ghost': {
                strong: ['psychic', 'ghost'],
                weak: ['dark']
            },
            'dragon': {
                strong: ['dragon'],
                weak: ['steel']
            },
            'dark': {
                strong: ['fighting', 'dark', 'fairy'],
                weak: ['fighting', 'dark', 'fairy']
            },
            'steel': {
                strong: ['ice', 'rock', 'fairy'],
                weak: ['fire', 'water', 'electric', 'steel']
            },
            'fairy': {
                strong: ['fire', 'poison', 'steel'],
                weak: ['poison', 'steel']
            },
            'normal': {
                strong: [],
                weak: ['rock', 'ghost', 'steel']
            }
        };
    }

    formatPokemonDataToHTML(pokemon: any, language: string = 'pl'): string {
        if (!pokemon) {
            return `
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; border: 2px solid #dee2e6;">
                    <h3 style="color: #856404;">🤖 Nie znaleziono Pokémona!</h3>
                    <p>Spróbuj wpisać inną nazwę Pokémona. 🔍✨</p>
                </div>
            `;
        }

        const types = pokemon.types?.map((t: any) => t.name) || [];
        const typeColors = types.map((type: string) => this.getTypeColor(type));
        const effectiveness = this.getTypeEffectiveness();
        
        const allStrengths = new Set<string>();
        const allWeaknesses = new Set<string>();
        
        types.forEach((type: string) => {
            const eff = effectiveness[type.toLowerCase()];
            if (eff) {
                eff.strong.forEach(s => allStrengths.add(s));
                eff.weak.forEach(w => allWeaknesses.add(w));
            }
        });

        const flavorText = pokemon.flavorTexts?.[0]?.flavor || 'Brak opisu dostępnego.';
        const sprite = pokemon.sprite || '';
        const shinySprite = pokemon.shinySprite || '';

        return `
            <div class="pokemon-info">
                <div class="pokemon-header">
                    <h2 class="pokemon-name"><i class="fa fa-star"></i> ${pokemon.species || 'Nieznany Pokémon'}</h2>
                    <div class="bulbapedia-link">
                        <a href="https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(pokemon.species || 'Pokemon')}" target="_blank" class="bulbapedia-button">
                            <i class="fa fa-external-link"></i> Bulbapedia
                        </a>
                    </div>
                    <div class="pokemon-images">
                        ${sprite ? `<img src="${sprite}" alt="${pokemon.species || 'Pokemon'}" class="pokemon-sprite">` : ''}
                        ${shinySprite ? `<img src="${shinySprite}" alt="${pokemon.species || 'Pokemon'} Shiny" class="pokemon-sprite shiny">` : ''}
                    </div>
                </div>

                <div class="pokemon-details">
                    <div>
                        <div class="detail-item"><span class="detail-label number">🔢 Numer Pokedex:</span> #${pokemon.num ? pokemon.num.toString().padStart(3, '0') : '000'}</div>
                        <div class="detail-item"><span class="detail-label type">🏷️ Typ:</span> ${types.map((type: string, i: number) => 
                            `<span class="type-badge" style="background: ${typeColors[i]};">${type}</span>`
                        ).join(' ')}</div>
                        <div class="detail-item"><span class="detail-label height">📏 Wzrost:</span> ${pokemon.height || 0} m</div>
                        <div class="detail-item"><span class="detail-label weight">⚖️ Waga:</span> ${pokemon.weight || 0} kg</div>
                    </div>
                    <div>
                        <div class="detail-item"><span class="detail-label color">🎨 Kolor:</span> ${pokemon.color || 'Nieznany'}</div>
                        <div class="detail-item"><span class="detail-label ability">⚡ Główna zdolność:</span> ${pokemon.abilities?.first?.name || 'Brak'}</div>
                        ${pokemon.abilities?.hidden ? `<div class="detail-item"><span class="detail-label hidden-ability">🔮 Ukryta zdolność:</span> ${pokemon.abilities.hidden.name}</div>` : ''}
                    </div>
                </div>

                <div class="pokemon-section">
                    <h3>📊 Statystyki bazowe</h3>
                    <div class="stats-grid">
                        <div class="stat-item hp">
                            <strong>❤️ HP</strong><br>${pokemon.baseStats?.hp || 0}
                        </div>
                        <div class="stat-item attack">
                            <strong>⚔️ Atak</strong><br>${pokemon.baseStats?.attack || 0}
                        </div>
                        <div class="stat-item defense">
                            <strong>🛡️ Obrona</strong><br>${pokemon.baseStats?.defense || 0}
                        </div>
                        <div class="stat-item sp-attack">
                            <strong>✨ Sp.Atak</strong><br>${pokemon.baseStats?.specialattack || 0}
                        </div>
                        <div class="stat-item sp-defense">
                            <strong>🛡️ Sp.Obrona</strong><br>${pokemon.baseStats?.specialdefense || 0}
                        </div>
                        <div class="stat-item speed">
                            <strong>💨 Szybkość</strong><br>${pokemon.baseStats?.speed || 0}
                        </div>
                    </div>
                </div>

                <div class="pokemon-section">
                    <h3>📖 Opis</h3>
                    <div class="description-box">
                        ${flavorText}
                    </div>
                </div>

                ${(allStrengths.size > 0 || allWeaknesses.size > 0) ? `
                <div class="pokemon-section">
                    <div class="effectiveness-grid">
                        ${allStrengths.size > 0 ? `
                        <div>
                            <h4 class="effective">✅ Efektywny przeciwko:</h4>
                            <div class="effectiveness-list">
                                ${Array.from(allStrengths).map(type => 
                                    `<span class="effectiveness-badge strong">${type}</span>`
                                ).join('')}
                            </div>
                        </div>` : ''}
                        ${allWeaknesses.size > 0 ? `
                        <div>
                            <h4 class="not-effective">❌ Mało efektywny przeciwko:</h4>
                            <div class="effectiveness-list">
                                ${Array.from(allWeaknesses).map(type => 
                                    `<span class="effectiveness-badge weak">${type}</span>`
                                ).join('')}
                            </div>
                        </div>` : ''}
                    </div>
                </div>` : ''}

                ${(pokemon.evolutions?.length > 0 || pokemon.preevolutions?.length > 0) ? `
                <div class="pokemon-section">
                    <h4 class="evolution">⚔️ Łańcuch ewolucji:</h4>
                    <div class="evolution-chain">
                        ${pokemon.preevolutions?.map((pre: any) => `<span>${pre.species || 'Nieznany'}</span> <span class="evolution-level">(Lvl ${pre.evolutionLevel || '?'})</span>`).join(' → ') || ''}
                        ${pokemon.preevolutions?.length > 0 ? ' → ' : ''}<span class="current-pokemon">${pokemon.species || 'Nieznany Pokémon'}</span>
                        ${pokemon.evolutions?.length > 0 ? ' → ' : ''}${pokemon.evolutions?.map((evo: any) => `<span>${evo.species || 'Nieznany'}</span> <span class="evolution-level">(Lvl ${evo.evolutionLevel || '?'})</span>`).join(' → ') || ''}
                    </div>
                </div>` : ''}

                ${pokemon.locations && pokemon.locations.length > 0 ? `
                <div class="pokemon-section">
                    <h4 class="locations">📍 Lokalizacje:</h4>
                    <div class="locations-box">
                        <div class="location-badges">
                            ${pokemon.locations.map((location: any) => 
                                `<span class="location-badge">📍 ${location.name || location}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>` : ''}

                ${pokemon.generation ? `
                <div class="pokemon-section">
                    <h4 class="generation">🎮 Generacja:</h4>
                    <div class="generation-box">
                        <span class="generation-badge">
                            ${pokemon.generation.name.replace('-', ' ').toUpperCase()} (#${pokemon.generation.id})
                        </span>
                    </div>
                </div>` : ''}

                <div class="pokemon-section">
                    <div class="additional-info-box">
                        <h4 class="additional-info">💡 Dodatkowe informacje:</h4>
                        <div class="info-grid">
                            ${pokemon.legendary ? '<span class="info-badge legendary">🏆 Legendarny</span>' : ''}
                            ${pokemon.mythical ? '<span class="info-badge mythical">✨ Mityczny</span>' : ''}
                            ${pokemon.catchRate?.percentageWithOrdinaryPokeballAtFullHealth ? 
                                `<span class="info-badge catch-rate">🎯 Łapalność: ${pokemon.catchRate.percentageWithOrdinaryPokeballAtFullHealth}</span>` : ''}
                            ${pokemon.gender?.male && pokemon.gender?.female ? 
                                `<span class="info-badge gender">♂️ ${pokemon.gender.male} ♀️ ${pokemon.gender.female}</span>` : ''}
                            ${pokemon.eggGroups && pokemon.eggGroups.length > 0 ? 
                                `<span class="info-badge egg-groups">🥚 ${pokemon.eggGroups.join(', ')}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createSynopsisPrompt(language: string): string {
        const langMap = {
            'pl': 'polski',
            'en': 'angielski'
        };

        return `Jesteś ekspertem Pokemon który komentuje dane już wyświetlone powyżej.
Odpowiadaj WYŁĄCZNIE w języku ${langMap[language]}.
FORMATUJ odpowiedzi w CZYSTYM HTML używając klas CSS (bez inline styles).

KOMPLETNE DANE POKEMON SĄ JUŻ WYŚWIETLONE POWYŻEJ!

Twoim zadaniem jest TYLKO skomentować te dane w stylizowanym tekście:

UŻYWAJ TEGO STYLU HTML Z KLASAMI:
<div class="ai-response-section">
<h3 class="ai-section-title">🎯 [NAGŁÓWEK]</h3>
<p class="ai-paragraph">Treść paragrafu...</p>
<ul class="ai-list">
<li class="ai-list-item">• Element listy</li>
</ul>
</div>

DOSTĘPNE KLASY CSS:
- .ai-response-section - główny kontener sekcji
- .ai-section-title - nagłówki sekcji (różne kolory)
- .ai-paragraph - paragrafy tekstowe
- .ai-list - listy bez kropek
- .ai-list-item - elementy list
- .ai-highlight - wyróżnienia
- .ai-strategy - sekcje strategii
- .ai-facts - sekcje ciekawostek

DODAJ TREŚĆ:
- Ciekawostki i mało znane fakty 💡
- Strategie walki i zastosowanie ⚔️
- Porównania z innymi Pokemonami 📊
- Miejsca występowania w grach 📍
- Ewolucje i metody 🔄
- Porady dla trenerów 🎯

NIE TWÓRZ:
- Tabel statystyk ❌
- Kart Pokemon ❌
- Schematów danych ❌
- Duplikowania informacji już pokazanych ❌

Bądź jak entuzjastyczny trener Pokemon dzielący się wiedzą!`;
    }

    createSystemPrompt(language: string): string {
        const langMap = {
            'pl': 'polski',
            'en': 'angielski'
        };

        return `Jesteś zaawansowanym Pokedexem AI - encyklopedią Pokémonów. 
Odpowiadaj WYŁĄCZNIE w języku ${langMap[language]}.
FORMATUJ odpowiedzi w CZYSTYM HTML używając klas CSS (bez inline styles).

Gdy użytkownik pyta o Pokémona, podaj informacje w następującym formacie HTML:

<div class="ai-pokemon-response">
<h2 class="ai-pokemon-title"><i class="fa fa-star"></i> NAZWA POKÉMONA</h2>

<div class="ai-pokemon-details">
<div>
<p class="ai-detail-item"><strong class="ai-detail-label number">🔢 Numer Pokedex:</strong> #XXX</p>
<p class="ai-detail-item"><strong class="ai-detail-label type">🏷️ Typ:</strong> <span class="pokemon-type">TYP1/TYP2</span></p>
<p class="ai-detail-item"><strong class="ai-detail-label height">📏 Wzrost:</strong> X.X m</p>
<p class="ai-detail-item"><strong class="ai-detail-label weight">⚖️ Waga:</strong> XX kg</p>
</div>
<div>
<p class="ai-detail-item"><strong class="ai-detail-label region">🌍 Region:</strong> REGION</p>
<p class="ai-detail-item"><strong class="ai-detail-label ability">⚡ Główna zdolność:</strong> ZDOLNOŚĆ</p>
<p class="ai-detail-item"><strong class="ai-detail-label hidden-ability">🔮 Ukryta zdolność:</strong> ZDOLNOŚĆ</p>
</div>
</div>

<h3 class="ai-section-header stats">📊 Statystyki bazowe</h3>
<div class="ai-stats-grid">
<div class="ai-stat-item hp">
<strong class="stat-label hp">❤️ HP:</strong> XXX
</div>
<div class="ai-stat-item attack">
<strong class="stat-label attack">⚔️ Atak:</strong> XXX
</div>
<div class="ai-stat-item defense">
<strong class="stat-label defense">🛡️ Obrona:</strong> XXX
</div>
<div class="ai-stat-item sp-attack">
<strong class="stat-label sp-attack">✨ Sp.Atak:</strong> XXX
</div>
<div class="ai-stat-item sp-defense">
<strong class="stat-label sp-defense">🛡️ Sp.Obrona:</strong> XXX
</div>
<div class="ai-stat-item speed">
<strong class="stat-label speed">💨 Szybkość:</strong> XXX
</div>
</div>

<h3 class="ai-section-header description">📖 Opis</h3>
<div class="ai-description-box">
OPIS POKÉMONA
</div>

<div class="ai-effectiveness-container">
<div>
<h4 class="ai-effectiveness-title effective">✅ Mocny przeciwko:</h4>
<ul class="ai-effectiveness-list">
<li class="ai-effectiveness-item strong">• TYP</li>
</ul>
</div>
<div>
<h4 class="ai-effectiveness-title not-effective">❌ Słaby przeciwko:</h4>
<ul class="ai-effectiveness-list">
<li class="ai-effectiveness-item weak">• TYP</li>
</ul>
</div>
</div>

<div class="ai-evolution-section">
<h4 class="ai-section-title evolution">⚔️ Ewolucje:</h4>
<div class="ai-evolution-info">
INFORMACJE O EWOLUCJI
</div>
</div>

<div class="ai-facts-section">
<h4 class="ai-section-title facts">💡 Ciekawostki:</h4>
<p class="ai-facts-content">CIEKAWOSTKI O POKÉMONIE</p>
</div>
</div>

Używaj klas CSS zamiast inline styles. Bądź entuzjastyczny jak prawdziwy Pokedex!

MOŻESZ POMAGAĆ Z:
1. Informacjami o Pokémonach (statystyki, typy, zdolności)
2. Lokalizacjami Pokémonów w grach (gdzie znaleźć, jak złapać)
3. Mechanikami gier Pokemon (ewolucja, przedmioty, strategie)
4. Przewodnikami po regionach (Kanto, Johto, Hoenn, itp.)
5. Grami Pokemon (oficjalne i fan-made, włączając PokéMMO, ROM hacki, itp.)
6. Społecznością Pokemon i kulturą

Dla pytań o lokalizacje Pokemon:
- Podaj konkretne miejsca, drogi, miasta
- Wymień poziomy, warunki pogodowe, pory dnia
- Opisz metody łapania (wędkowanie, surfowanie, itp.)
- Użyj klas CSS z emoji

WAŻNE: Jeśli dane Pokemon zostały już wyświetlone powyżej w formatowanej tabeli/karcie, NIE TWÓRZ kolejnej tabeli/schematu!
Zamiast tego podaj TYLKO zwykły tekst konwersacyjny z klasami CSS:
- Ciekawostkami i dodatkowymi informacjami
- Strategiami walki i poradami
- Historią i ciekawymi faktami
- Porównaniami z innymi Pokemonami
Używaj klas CSS (paragrafy, nagłówki, listy) ale BEZ tabel i schematu danych!

REGUŁA: Jeśli pytanie zawiera JAKIEKOLWIEK z tych słów: "poke", "pokemon", "pokémon", "pokemmo", "pokeball" - ZAWSZE odpowiadaj normalnie i NIE UŻYWAJ fallback message.

FALLBACK używaj TYLKO gdy pytanie dotyczy czegoś całkowicie niezwiązanego z Pokemon (pogoda, polityka, matematyka, inne gry niż Pokemon).

<div class="ai-fallback-message">
<h3 class="ai-fallback-title">🤖 Jestem Pokedexem AI!</h3>
<p class="ai-fallback-text">Mogę pomóc z informacjami o Pokémonach i grach Pokemon. Zapytaj mnie o swojego ulubionego Pokémona lub jak go znaleźć! 🔍✨</p>
</div>

PRZYKŁADY KIEDY ODPOWIADAĆ NORMALNIE:
- "co to jest pokemmo?" → ODPOWIADAJ (zawiera "poke")
- "what is pokemmo?" → ODPOWIADAJ (zawiera "poke") 
- "pokemon games" → ODPOWIADAJ (zawiera "pokemon")
- "jak działa pokeball?" → ODPOWIADAJ (zawiera "poke")`;
    }
}

// Export both default singleton and instance type for DI
export default HtmlFormattingService.getSingleton();
export { HtmlFormattingService as HtmlFormattingServiceInstance };
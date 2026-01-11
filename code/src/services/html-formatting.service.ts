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
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <h2 style="color: #e74c3c; margin: 0;"><i class="fa fa-star"></i> ${pokemon.species || 'Nieznany Pokémon'}</h2>
                    <div style="display: flex; gap: 10px;">
                        ${sprite ? `<img src="${sprite}" alt="${pokemon.species || 'Pokemon'}" style="width: 80px; height: 80px; image-rendering: pixelated;">` : ''}
                        ${shinySprite ? `<img src="${shinySprite}" alt="${pokemon.species || 'Pokemon'} Shiny" style="width: 80px; height: 80px; image-rendering: pixelated; filter: brightness(1.2);">` : ''}
                    </div>
                </div>

                <div class="pokemon-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <p><strong style="color: #3498db;">🔢 Numer Pokedex:</strong> #${pokemon.num ? pokemon.num.toString().padStart(3, '0') : '000'}</p>
                        <p><strong style="color: #27ae60;">🏷️ Typ:</strong> ${types.map((type: string, i: number) => 
                            `<span style="background: ${typeColors[i]}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.9em;">${type}</span>`
                        ).join(' ')}</p>
                        <p><strong style="color: #3498db;">📏 Wzrost:</strong> ${pokemon.height || 0} m</p>
                        <p><strong style="color: #9b59b6;">⚖️ Waga:</strong> ${pokemon.weight || 0} kg</p>
                    </div>
                    <div>
                        <p><strong style="color: #e67e22;">🎨 Kolor:</strong> ${pokemon.color || 'Nieznany'}</p>
                        <p><strong style="color: #1abc9c;">⚡ Główna zdolność:</strong> ${pokemon.abilities?.first?.name || 'Brak'}</p>
                        ${pokemon.abilities?.hidden ? `<p><strong style="color: #34495e;">🔮 Ukryta zdolność:</strong> ${pokemon.abilities.hidden.name}</p>` : ''}
                    </div>
                </div>

                <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📊 Statystyki bazowe</h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>❤️ HP</strong><br>${pokemon.baseStats?.hp || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #26de81, #20bf6b); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>⚔️ Atak</strong><br>${pokemon.baseStats?.attack || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #48dbfb, #0abde3); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>🛡️ Obrona</strong><br>${pokemon.baseStats?.defense || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #ff9ff3, #f368e0); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>✨ Sp.Atak</strong><br>${pokemon.baseStats?.specialattack || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #ff6348, #ff4757); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>🛡️ Sp.Obrona</strong><br>${pokemon.baseStats?.specialdefense || 0}
                    </div>
                    <div style="background: linear-gradient(135deg, #7bed9f, #70a1ff); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                        <strong>💨 Szybkość</strong><br>${pokemon.baseStats?.speed || 0}
                    </div>
                </div>

                <h3 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 5px;">📖 Opis</h3>
                <p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #27ae60; border-radius: 5px; margin-bottom: 20px;">
                    ${flavorText}
                </p>

                ${(allStrengths.size > 0 || allWeaknesses.size > 0) ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${allStrengths.size > 0 ? `
                    <div>
                        <h4 style="color: #27ae60;">✅ Efektywny przeciwko:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${Array.from(allStrengths).map(type => 
                                `<span style="background: #d5f5d5; color: #27ae60; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${type}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                    ${allWeaknesses.size > 0 ? `
                    <div>
                        <h4 style="color: #e74c3c;">❌ Mało efektywny przeciwko:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${Array.from(allWeaknesses).map(type => 
                                `<span style="background: #fdd5d5; color: #e74c3c; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${type}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                </div>` : ''}

                ${(pokemon.evolutions?.length > 0 || pokemon.preevolutions?.length > 0) ? `
                <div style="margin-top: 20px;">
                    <h4 style="color: #27ae60;">⚔️ Łańcuch ewolucji:</h4>
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #42a5f5; color: #2c3e50;">
                        ${pokemon.preevolutions?.map((pre: any) => `<span style="color: #34495e;">${pre.species || 'Nieznany'}</span> <span style="color: #7f8c8d;">(Lvl ${pre.evolutionLevel || '?'})</span>`).join(' → ') || ''}
                        ${pokemon.preevolutions?.length > 0 ? ' → ' : ''}<strong style="color: #2c3e50;">${pokemon.species || 'Nieznany Pokémon'}</strong>
                        ${pokemon.evolutions?.length > 0 ? ' → ' : ''}${pokemon.evolutions?.map((evo: any) => `<span style="color: #34495e;">${evo.species || 'Nieznany'}</span> <span style="color: #7f8c8d;">(Lvl ${evo.evolutionLevel || '?'})</span>`).join(' → ') || ''}
                    </div>
                </div>` : ''}

                ${pokemon.locations && pokemon.locations.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h4 style="color: #8e44ad;">📍 Lokalizacje:</h4>
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${pokemon.locations.map((location: string) => 
                                `<span style="background: #9c27b0; color: white; padding: 6px 12px; border-radius: 16px; font-size: 0.9em;">📍 ${location}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>` : ''}

                <div style="margin-top: 20px; background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #1976d2; margin-top: 0;">💡 Dodatkowe informacje:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        ${pokemon.legendary ? '<span style="background: #ff6b6b; color: #c0392b; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">🏆 Legendarny</span>' : ''}
                        ${pokemon.mythical ? '<span style="background: #e1bee7; color: #7b1fa2; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">✨ Mityczny</span>' : ''}
                        ${pokemon.catchRate?.percentageWithOrdinaryPokeballAtFullHealth ? 
                            `<span style="background: #c8e6c9; color: #2e7d32; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">🎯 Łapalność: ${pokemon.catchRate.percentageWithOrdinaryPokeballAtFullHealth}</span>` : ''}
                        ${pokemon.gender?.male && pokemon.gender?.female ? 
                            `<span style="background: #ffcdd2; color: #d32f2f; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">♂️ ${pokemon.gender.male} ♀️ ${pokemon.gender.female}</span>` : ''}
                        ${pokemon.eggGroups && pokemon.eggGroups.length > 0 ? 
                            `<span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.9em;">🥚 ${pokemon.eggGroups.join(', ')}</span>` : ''}
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

KOMPLETNE DANE POKEMON SĄ JUŻ WYŚWIETLONE POWYŻEJ!

Twoim zadaniem jest TYLKO skomentować te dane w zwykłym tekście:
- Dodaj ciekawostki i mało znane fakty
- Opisz strategie walki i zastosowanie
- Porównaj z innymi Pokemonami
- Opowiedz o miejscach występowania w grach
- Wspomnij o ewolucji i metodach
- Podziel się poradami dla trenerów

UŻYWAJ:
- Zwykłych paragrafów <p>
- Nagłówków <h3>, <h4>
- List <ul><li>
- Pogrubień <strong>
- Emoji dla urozmaicenia

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
FORMATUJ odpowiedzi w CZYSTYM HTML bez znaczników <html>, <body> czy <head>.

Gdy użytkownik pyta o Pokémona, podaj informacje w następującym formacie HTML:

<div class="pokemon-info">
<h2 style="color: #e74c3c; margin-bottom: 15px;"><i class="fa fa-star"></i> NAZWA POKÉMONA</h2>

<div class="pokemon-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
<div>
<p><strong style="color: #3498db;">🔢 Numer Pokedex:</strong> #XXX</p>
<p><strong style="color: #27ae60;">🏷️ Typ:</strong> <span class="pokemon-type">TYP1/TYP2</span></p>
<p><strong style="color: #3498db;">📏 Wzrost:</strong> X.X m</p>
<p><strong style="color: #9b59b6;">⚖️ Waga:</strong> XX kg</p>
</div>
<div>
<p><strong style="color: #e67e22;">🌍 Region:</strong> REGION</p>
<p><strong style="color: #1abc9c;">⚡ Główna zdolność:</strong> ZDOLNOŚĆ</p>
<p><strong style="color: #34495e;">🔮 Ukryta zdolność:</strong> ZDOLNOŚĆ</p>
</div>
</div>

<h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📊 Statystyki bazowe</h3>
<div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #e74c3c;">❤️ HP:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #e74c3c;">⚔️ Atak:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #27ae60;">🛡️ Obrona:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #9b59b6;">✨ Sp.Atak:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #1abc9c;">🛡️ Sp.Obrona:</strong> XXX
</div>
<div style="background: #ecf0f1; padding: 8px; border-radius: 5px; text-align: center;">
<strong style="color: #3498db;">💨 Szybkość:</strong> XXX
</div>
</div>

<h3 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 5px;">📖 Opis</h3>
<p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #27ae60; border-radius: 5px; margin-bottom: 20px;">
OPIS POKÉMONA
</p>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
<div>
<h4 style="color: #27ae60;">✅ Mocny przeciwko:</h4>
<ul style="list-style: none; padding: 0;">
<li style="background: #d5f5d5; padding: 5px; margin: 3px 0; border-radius: 3px;">• TYP</li>
</ul>
</div>
<div>
<h4 style="color: #e74c3c;">❌ Słaby przeciwko:</h4>
<ul style="list-style: none; padding: 0;">
<li style="background: #fdd5d5; padding: 5px; margin: 3px 0; border-radius: 3px;">• TYP</li>
</ul>
</div>
</div>

<div style="margin-top: 20px;">
<h4 style="color: #27ae60;">⚔️ Ewolucje:</h4>
<div style="background: #e8f5e8; padding: 10px; border-radius: 5px; border-left: 4px solid #4caf50;">
INFORMACJE O EWOLUCJI
</div>
</div>

<div style="margin-top: 15px; background: #e3f2fd; padding: 15px; border-radius: 8px;">
<h4 style="color: #1976d2; margin-top: 0;">💡 Ciekawostki:</h4>
<p>CIEKAWOSTKI O POKÉMONIE</p>
</div>
</div>

Używaj kolorowych stylów CSS inline i emoji. Bądź entuzjastyczny jak prawdziwy Pokedex!

MOŻESZ POMAGAĆ Z:
1. Informacjami o Pokémonach (statystyki, typy, zdolności)
2. Lokalizacjami Pokémonów w grach (gdzie znaleźć, jak złapać)
3. Mechanikami gier Pokemon (ewolucja, przedmioty, strategie)
4. Przewodnikami po regionach (Kanto, Johto, Hoenn, itp.)

Dla pytań o lokalizacje Pokemon:
- Podaj konkretne miejsca, drogi, miasta
- Wymień poziomy, warunki pogodowe, pory dnia
- Opisz metody łapania (wędkowanie, surfowanie, itp.)
- Użyj kolorowego HTML z emoji

WAŻNE: Jeśli dane Pokemon zostały już wyświetlone powyżej w formatowanej tabeli/karcie, NIE TWÓRZ kolejnej tabeli/schematu!
Zamiast tego podaj TYLKO zwykły tekst konwersacyjny z:
- Ciekawostkami i dodatkowymi informacjami
- Strategiami walki i poradami
- Historią i ciekawymi faktami
- Porównaniami z innymi Pokemonami
Używaj zwykłego HTML (paragrafy, nagłówki, listy) ale BEZ tabel i schematu danych!

TYLKO jeśli pytanie dotyczy czegoś całkowicie niezwiązanego z Pokemon (np. pogoda, polityka), odpowiedz: 
<div style="text-align: center; padding: 20px; background: #f3e5f5; border-radius: 10px; border: 2px solid #9c27b0;">
<h3 style="color: #7b1fa2;">🤖 Jestem Pokedexem AI!</h3>
<p>Mogę pomóc z informacjami o Pokémonach i grach Pokemon. Zapytaj mnie o swojego ulubionego Pokémona lub jak go znaleźć! 🔍✨</p>
</div>`;
    }
}

// Export both default singleton and instance type for DI
export default HtmlFormattingService.getSingleton();
export { HtmlFormattingService as HtmlFormattingServiceInstance };
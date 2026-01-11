export type ICurrencies = { [key: string]: string };

export const currencies: ICurrencies = {
    en: 'usd',
    de: 'eur',
    es: 'eur',
    it: 'eur',
    pl: 'pln',
    zh: 'cny'
};

export function getCurrency(lang: string): string {
    return currencies[lang] || 'usd';
}
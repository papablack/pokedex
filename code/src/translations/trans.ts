import { translations } from './i18n';
import storageServiceInstance from '../services/storage.service';  

export { getCurrency } from './currencies';

export function getTranslations(lang: string): Record<string, string> 
{
    return translations[lang] || translations.en;
}

export function translate(key: string, lang: string = 'en'): string 
{
    const translation = getTranslations(lang);
    return translation[key] || key;

}

export const langKey = '_lang';
    
export function getCurrentLanguage(): string 
{
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(langKey) || 'en';
    }
    return 'en';
}

export function getLanguageList(): string[] 
{
    return Object.keys(translations);
}   
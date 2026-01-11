import { langKey } from "../../translations/trans";

export function setLanguage(lang: string): void
{
    localStorage.setItem(langKey, lang);
}   

export function getLanguage(): string | null
{
    return localStorage.getItem(langKey) || null;
}
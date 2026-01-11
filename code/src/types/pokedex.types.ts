export interface IPokedexSettings {
    apiKey: string;
    model: string;
    language: string;
    temperature: number;
    streaming: boolean;
}

export interface IAiResponse {
    choices: Array<{
        message?: {
            content: string;
        };
        delta?: {
            content?: string;
        };
    }>;
}
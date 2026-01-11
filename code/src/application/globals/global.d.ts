// Global type extensions

declare global {
    interface String {
        /**
         * Capitalizes the first letter of a string and converts the rest to lowercase
         * @returns The capitalized string
         */
        capitalize(): string;
        t(): string;       
    }
}

export {};

interface RGBColour {
    r: number;
    g: number;
    b: number;
}

export interface ColourPool {
    getColour: (i: number, alpha?: number) => string
}

export function createColourPool(numberOfColours: number): ColourPool {
    const colours: RGBColour[] = [];

    generateColours(numberOfColours);

    function generateColours(numberOfColours: number): void {
        const values = [255, 225, 205, 175, 160];
        const letters = ['g', 'b', 'r']; // Order matters: green first
        let nextLetter = 0;
        let nextValue = 0;
        const wrapAround = (value, range) => {
            return (value + 1 % range + range) % range;
        };
        for (let i = 0; i < numberOfColours; ++i) {
            const colour = {} as RGBColour;
            for (const letter of letters) {
                if (letter === letters[nextLetter]) {
                    colour[letter] = 255;
                } else {
                    colour[letter] = values[nextValue];
                }
                nextValue = wrapAround(nextValue, values.length);
            }
            nextLetter = wrapAround(nextLetter, letters.length);
            colours.push(colour);
        }
    }

    function getColour(i: number, alpha: number = 0.8): string {
        const colour = colours[i];
        return `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${alpha})`;
    }

    return {
        getColour: getColour,
    };
}

export function getGroundPinColor(): string {
    return 'rgba(227, 227, 227, 0.8)';
}
import {Bus} from "../bus/Bus";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {PlacedModule} from "../placedmodule/PlacedModule";


/**
 * Search a PlacedModule's buses for one that:
 * 1) Is compatible to a given require or provide
 * 2) Has the closest name to a given bus
 */
export class BusMapper {

    public matchRequire(placedModule: PlacedModule,
                        toRequire: string,
                        provideToConnect: ProvideBus): RequireBus | null {

        const eligibleRequires = this.filterEligibleRequires(placedModule, provideToConnect);
        return this.matchClosestName(eligibleRequires, toRequire) as RequireBus;
    }

    public matchProvide(placedModule: PlacedModule,
                        toProvide: string,
                        requireToConnect: RequireBus): ProvideBus | null {

        const eligibleProvides = this.filterEligibleProvides(placedModule, requireToConnect);
        return this.matchClosestName(eligibleProvides, toProvide) as ProvideBus;
    }

    private filterEligibleProvides(placedModule: PlacedModule,
                                   requireToConnect: RequireBus): ProvideBus[] {
        return placedModule.getProvides().filter((provide) =>
            provide.isMatch(requireToConnect) &&
            provide.hasEnoughCapacityFor(requireToConnect)
        );
    }

    private filterEligibleRequires(placedModule: PlacedModule,
                                   provideToConnect: ProvideBus): RequireBus[] {
        return placedModule.getRequires().filter((require) =>
            !require.implementsVlogicTemplate() &&
            !require.isConnected() &&
            provideToConnect.isMatch(require)
        );
    }

    private matchClosestName(fromBuses: Bus[], toBus: string): Bus | null {
        let closestMatch = -1;
        let closestBus = null;
        const stringComparer = new StringComparer();
        for (const bus of fromBuses) {
            const similarity = stringComparer.compareSimilarity(bus.name, toBus);
            if (similarity === 1) {
                return bus;
            }
            if (similarity > closestMatch) {
                closestMatch = similarity;
                closestBus = bus;
            }
        }
        return closestBus;
    }
}


/**
 * Given two strings, find the percentage of similarity between them,
 * where 1 = 100% similarity, and 0 = 0% similarity.
 * 1) Check for exact match.
 * 2) Compare string bigrams (pairs of characters) across each word.
 */
export class StringComparer {

    public compareSimilarity(name: string, toMatch: string): number {
        if (name === toMatch) {
            return 1;
        }
        const shorter = name.length < toMatch.length ? name : toMatch;
        const longer = shorter !== name ? name : toMatch;
        const shorterWords = shorter.split(' ');
        const longerWords = longer.split(' ');
        const numLongerWords = longerWords.length;
        let overallSimilarity = 0;

        for (const word of shorterWords) {
            overallSimilarity += this.matchWordSimilarity(word, longerWords);
        }
        return overallSimilarity / numLongerWords;
    }

    /**
     * @param word: Given this string, find the most-closely matching string in otherWords and return
     * the similarity percentage.
     * @param otherWords: The list of strings to search through.
     */
    private matchWordSimilarity(word: string, otherWords: string[]): number {
        let closestMatch = null;
        let closestSimilarity = 0;
        for (const otherWord of otherWords) {
            if (word === otherWord) {
                return 1;
            }
            const similarity = this.matchBigrams(word, otherWord);
            if (closestSimilarity < similarity) {
                closestMatch = otherWord;
                closestSimilarity = similarity;
            }
        }
        // Don't compare the same word next time.
        const index = otherWords.indexOf(closestMatch);
        otherWords.splice(0, index);
        return closestSimilarity;
    }

    /**
     * Returns a similarity percentage between two strings of length > 2 (Sorensen-Dice's coefficient)
     */
    private matchBigrams(name: string, toMatch: string): number {
        if (name.length < 2 || toMatch.length < 2) {
            return 0;
        }

        const nameLength = name.length - 1;
        const toMatchLength = toMatch.length - 1;
        const nameBigrams = {};
        for (let i = 0; i < nameLength; ++i) {
            const bigram = name.substr(i, 2);
            nameBigrams[bigram] = nameBigrams[bigram] ? nameBigrams[bigram] + 1 : 1;
        }

        let matches = 0;
        for (let i = 0; i < toMatchLength; ++i) {
            const toMatchBigram = toMatch.substr(i, 2);
            if (nameBigrams[toMatchBigram]) {
                --nameBigrams[toMatchBigram];
                matches += 2;
            }
        }
        return (matches) / (nameLength + toMatchLength);
    }
}

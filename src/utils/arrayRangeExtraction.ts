/**
 * Converts array of integers to a string with the ranges extracted.
 * Eg.
 * Input: [1, 3, 4, 5, 10, 11, 12]
 * Output: '1, 3-5, 10-12'
 */
export function arrayRangeExtraction(array: number[]): string {
    const sortedArray = array.slice().sort((a, b) => a - b);
    let output = '';
    for (let i = 0; i < sortedArray.length; i++) {
        const prev = sortedArray[i - 1];
        const current = sortedArray[i];
        const next = sortedArray[i + 1];
        if (!prev || prev !== (current - 1)) {
            if (i !== 0) {
                output += ', ';
            }
            output += current;
        } else if (!next || next !== (current + 1)) {
            output += `-${current}`;
        }
    }
    return output;
}
/**
 * Checks if a string matches another string from a list.
 * Returns an incremented result such that it is a unique string.
 * Eg.
 * Input: 'wolololo', ['wolololo', 'wolololo 1', 'tazdingo']
 * Output: 'wolololo 2'
 */
export function enumerateString(toMatch: string, stringList: string[], separator=' '): string {
    let enumerationRequired = false;
    const numsMap = {};
    const [mainTitle, currentNum] = segment(toMatch, separator);
    for (const string of stringList) {
        const [otherMainTitle, num] = segment(string, separator);
        if (otherMainTitle !== mainTitle) {
            continue;
        }
        if (num) {
            numsMap[parseInt(num)] = true;
        } else {
            enumerationRequired = true;
        }
    }
    if (!enumerationRequired && !currentNum) {
        return toMatch;
    }
    if (currentNum && !numsMap[parseInt(currentNum)]) {
        return [mainTitle, currentNum].join(separator);
    }
    let num = 1;
    while (numsMap[num]) {
        ++num;
    }
    return [mainTitle, num].join(separator);
}

/**
 * Eg.
 * 'boo 1' => ['boo', '1']
 * 'tazdingo25 25' => ['tazdingo25', '25']
 * 'weeee' => ['weeee', '']
 */
function segment(input: string, separator: string): [string, string] {
    const split = input.split(separator);
    if (split.length === 1) {
        return [input, ''];
    }
    const last = split.length - 1;
    if (!isNaN(split[last] as any)) {
        const exceptLast = split.slice(0, last);
        return [exceptLast.join(separator), split[last]];
    }
    return [input, ''];
}

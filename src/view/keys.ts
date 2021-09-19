import * as $ from 'jquery';
import * as _ from "underscore";

const keys = _.extend(
    _.invert($.ui.keyCode),
    _.invert({
        AltGr: 225,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        '`': 192
    })
);

export function getKeyCode(str: string): number {
    return str.charCodeAt(0);
}

export function getKeyName(keyCode: number): string {
    if (keyCode in keys) {
        return keys[keyCode];
    }
    return String.fromCharCode(keyCode);
}

export function isArrowKey(keyCode: number): boolean {
    const arrow_keys = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const keyname = this.getKeyName(keyCode);
    return _.contains(arrow_keys, keyname);
}

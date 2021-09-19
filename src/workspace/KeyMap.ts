import * as $ from 'jquery';

/**
 * Keyboard shortcuts for the workspace.
 */
export class KeyMap {
    constructor(private event: JQueryKeyEventObject) {}

    private get keyCode(): number {
        return this.event.which;
    }

    get isEscape() {
        return this.keyCode === $.ui.keyCode.ESCAPE;
    }

    private get isCtrlPressed(): boolean {
        return this.event.ctrlKey || this.event.metaKey
    }

    private isKey(expectedKey: string): boolean {
        if ((this.event.key <= 'Z' && !this.event.shiftKey) ||
            this.event.key >= 'a' && this.event.shiftKey) {
            expectedKey = expectedKey[0] <= 'Z' ? expectedKey.toLowerCase() : expectedKey.toUpperCase();
        }
        return this.event.key === expectedKey;
    }

    private isCtrlPlus(expectedKey: string): boolean {
        return this.isCtrlPressed && this.isKey(expectedKey);
    }

    get isUndo() {
        return this.isCtrlPlus('z');
    }

    get isRedo() {
        return this.isCtrlPlus('Z');
    }

    get isSave() {
        return this.isCtrlPlus('s');
    }

    get isShiftKey(): boolean {
        return this.event.shiftKey || this.keyCode === 16;
    }
}

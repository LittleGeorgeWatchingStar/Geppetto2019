import * as $ from 'jquery';

/**
 * Provides basic information about the browser window.
 */
export class Window {

    get height(): number {
        return $(window).height();
    }

    get width(): number {
        return $(window).width();
    }

    get centerX(): number {
        return this.height / 2;
    }

    get centerY(): number {
        return this.width / 2;
    }

    /**
     * Converts a position to a percentage of the window height.
     */
    toHeightPercentage(top: number): number {
        return top / this.height * 100;
    }

    /**
     * Converts a position to a percentage of the window width.
     */
    toWidthPercentage(left: number): number {
        return left / this.width * 100;
    }
}

/**
 * Wraps a DOM element and provides info we need to calculate
 * the position of tutorial textboxes and arrows.
 */
export class Element {
    private $element: JQuery;

    constructor($element: JQuery) {
        this.$element = $element;
    }

    get top(): number {
        return this.$element.offset().top;
    }

    get left(): number {
        return this.$element.offset().left;
    }

    get width(): number {
        return this.$element.width();
    }

    get height(): number {
        return this.$element.height();
    }

    isHorizontal(): boolean {
        return this.height < this.width;
    }

    isSmallerThanWindowHalf(window: Window): boolean {
        return this.height < window.height / 2;
    }

    isInWindowTopHalf(window: Window): boolean {
        return this.height / 2 < window.centerY - this.top;
    }

    isInWindowRightHalf(window: Window): boolean {
        return this.width / 2 > window.centerX - this.left;
    }
}

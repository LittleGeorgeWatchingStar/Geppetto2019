export const TUTORIAL_TEXT_SHOW = 'tutorial.showtext';
export const TUTORIAL_TEXT_HIDE = 'tutorial.hidetext';
export const TUTORIAL_ARROW_SHOW = 'tutorial.showarrow';
export const TUTORIAL_ARROW_HIDE = 'tutorial.hidearrow';

/**
 * The data that TextboxView needs to render a tutorial text box.
 *
 * @see {TextboxView}
 */
export interface TextboxEvent {
    html: string;
    top: number;
    left: number;
    hideAfter: number;
    dismiss(): void;
}


/**
 * The data that the Arrow view needs to render the indicator arrow.
 *
 * @see {ArrowView}
 */
export interface ArrowEvent {
    top: number;
    left: number;
    rotate: number;
}

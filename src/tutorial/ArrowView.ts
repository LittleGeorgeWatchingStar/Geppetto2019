import * as Backbone from "backbone";
import * as $ from "jquery";
import * as helparrowTemplate from "templates/helparrow";
import events from "utils/events";
import {DESIGN_CLONE, DESIGN_NEW, DESIGN_OPEN} from "../design/events";
import {ArrowEvent, TUTORIAL_ARROW_HIDE, TUTORIAL_ARROW_SHOW} from "./events";
import {TutorialEvent} from "./TutorialEvent";

const ANIMATION_DURATION = 1000;

type ArrowDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * View for the tutorial indictator arrow.
 */
export class ArrowView extends Backbone.View<TutorialEvent> {
    private animationFrame: number;

    public initialize() {
        this.animationFrame = 0;
        this.setElement(helparrowTemplate());
        events.subscribe(TUTORIAL_ARROW_SHOW, event => this.show(event));
        events.subscribe(TUTORIAL_ARROW_HIDE, event => this.hide());
        events.subscribe(DESIGN_NEW, () => this.hide());
        events.subscribe(DESIGN_OPEN, () => this.hide());
        events.subscribe(DESIGN_CLONE, () => this.hide());
        $('#tutorial-container').append(this.el);
        return this;
    }

    /**
     * Responsible for showing arrow on specific position.
     * Accepts coordinates of the top point of the arrow
     * and before showing translates then into real css properties.
     * Default arrow orientation is top.
     */
    private show(event: ArrowEvent) {
        let top = event.top * $(window).height() / 100;
        let left = event.left * $(window).width() / 100;
        const rotation = event.rotate;
        if (rotation === 90) {
            left -= this.$el.height();
        } else if (rotation === 180) {
            top -= this.$el.height();
        } else {
            left -= this.$el.width() / 2;
        }

        const direction = this.getAnimationDirection(rotation);
        // Stop animation before running any new animation
        cancelAnimationFrame(this.animationFrame);
        if (direction === 'top' || direction === 'bottom') {
            this.$el.css({
                "left": left,
                'transform': 'rotate(' + rotation + 'deg)'
            });
            this.animateTop(top, direction);
        } else if (direction === 'left' || direction === 'right') {
            this.$el.css({
                "top": top,
                'transform': 'rotate(' + rotation + 'deg)'
            });
            this.animateLeft(left, direction);
        }
        this.animateOpacity();

        this.$el.removeClass("hidden");

    }

    private getAnimationDirection(rotation: number): ArrowDirection {
        if (rotation === 0) {
            return 'bottom'
        } else if (rotation === 180) {
            return 'top'
        } else if (rotation === 90) {
            return 'left'
        } else if (rotation === 270) {
            return 'right';
        }
    }

    private easeOutQuint(t, b, c, d) {
        t /= d;
        t--;
        return c * (Math.pow(t, 5) + 1) + b;
    }

    private animateTop(endPosition: number, direction: ArrowDirection) {
        const positionDifference = 1000;
        const factor = direction === 'bottom' ? positionDifference : -positionDifference;
        const topStart = endPosition + factor;
        let pos = topStart;
        let t = 0;
        const move = () => {
            t += 10;
            pos = this.easeOutQuint(t, topStart, -factor, ANIMATION_DURATION);
            this.$el.css({
                'top': pos
            });
            if (direction === 'bottom' && pos > endPosition || direction === 'top' && pos < endPosition) {
                this.animationFrame = requestAnimationFrame(move);
            }
        };
        this.animationFrame = requestAnimationFrame(move);
    }

    private animateLeft(endPosition: number, direction: ArrowDirection) {
        const positionDifference = 1000;
        const factor = direction === 'right' ? positionDifference : -positionDifference;
        const leftStart = endPosition + factor;
        let pos = leftStart;
        let t = 0;
        const move = () => {
            t += 10;
            pos = this.easeOutQuint(t, leftStart, -factor, ANIMATION_DURATION);
            this.$el.css({
                'left': pos
            });
            if (direction === 'right' && pos > endPosition || direction === 'left' && pos < endPosition) {
                this.animationFrame = requestAnimationFrame(move);
            }
        };
        this.animationFrame = requestAnimationFrame(move);
    }

    private animateOpacity() {
        const start = 0.01;
        let opc = start;
        let t = 0;
        const increase = () => {
            t += 10;
            opc = this.easeOutQuint(t, start, 0.99, 3000);
            this.$el.css({
                'opacity': opc
            });
            if (opc <= 1) {
                requestAnimationFrame(increase);
            }
        };
        requestAnimationFrame(increase);
    }

    private hide() {
        this.$el.addClass("hidden");
    }
}

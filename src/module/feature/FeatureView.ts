import * as Backbone from 'backbone';
import {Feature} from "./Feature";
import kebabCase from "../../utils/kebabCase";

export default class FeatureView extends Backbone.View<Feature> {
    private feature: Feature;

    initialize() {
        this.feature = this.model;

        this.setElement(document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.$el.attr({'class': kebabCase(this.feature.type)});

        this.listenTo(this.feature, 'remove', this.remove);
        this.listenTo(this.feature, 'change:points', this.render);

        return this.render();
    }

    public render() {
        this.setLineCoord();
        return this;
    }

    /**
     * For rotating Placed Module features
     */
    private setLineCoord():void  {
        const points = this.feature.points;

        this.$el.attr({
            x1: points[0].x,
            y1: points[0].y,
            x2: points[1].x,
            y2: points[1].y
        });
    }
}

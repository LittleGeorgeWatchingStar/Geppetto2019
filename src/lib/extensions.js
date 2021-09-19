/*global define*/
define(function (require) {

    "use strict";

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),

        // Underscore mixins
        mixins = {},

        /*
         * remove this!
         */
        events = require('utils/events');

    _.extend(Backbone.View.prototype, {

        renderAttributes: function (attributes) {
            _.each(attributes, function (attribute) {
                // classList works on both svgs and DOM nodes, as opposed to
                // jQuery's addClass/removeClass.
                this.model.get(attribute) ? this.el.classList.add(attribute) : this.el.classList.remove(attribute);
            }, this);
        },

        /*
         * change this to use backbone events
         */
        contextmenu: function (browser_event) {
            var event = $.Event('menu', {
                model: this.model,
                x: browser_event.pageX,
                y: browser_event.pageY
            });
            events.publish(event);
            return false;
        }
    });

    mixins.setDefault = function(obj, key, value) {
        if ( ! _.has(obj, key)) {
            obj[key] = value;
        }
    };

    mixins.getDefault = function(obj, key, value) {
        if (key in obj) {
            return obj[key];
        }
        return value;
    };

    _.mixin(mixins);

    $.fn.extend({
        $: $.fn.find
    });

});

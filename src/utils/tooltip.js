import * as jQuery from 'jquery';
import 'qtip2';

function qtip_wrapper(content, options) {
    "use strict";

    const qtip = {
        content: {},
        hide: {},
        position: {},
        show: {},
        style: {}
    };

    qtip.content.text = content;
    // add our own class to style it as we like
    qtip.style.classes = 'tooltip';
    // don't bind, show immediately
    qtip.show.ready = true;
    // show right away without effect
    qtip.show.effect = false;
    qtip.show.delay = 0;
    // hide right away without effect
    qtip.hide.effect = false;
    qtip.hide.delay = 0;
    qtip.position.my = 'top center';
    qtip.position.at = 'bottom center';
    qtip.position.viewport = jQuery(window);

    if (options) {
        if (options.hover) {
            qtip.show.event = 'mouseenter';
            qtip.hide.event = 'mouseleave';
            qtip.show.ready = false;
        }
        if (options.my) {
            qtip.position.my = options.my;
        }
        if (options.at) {
            qtip.position.at = options.at;
        }
        if (options.error) {
            qtip.style.classes += ' error';
        }
    }
    if(!this.qtip){
        return null;
    }
    return this.qtip(qtip);

}

function remove_tooltip() {
    "use strict";
    if(!this.qtip){
        return null;
    }
    return this.qtip('destroy', true);
}

jQuery.fn.extend({
    add_tooltip: qtip_wrapper,
    remove_tooltip: remove_tooltip
});

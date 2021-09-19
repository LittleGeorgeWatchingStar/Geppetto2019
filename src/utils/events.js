/*global debug*/
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as Backbone from 'backbone';
import * as Config from 'Config';

const subscribe = function (event, fn) {
    const $this = $(this);
    $this.on.apply($this, arguments);
};

const unsubscribe = function(event, fn) {
    const $this = $(this);
    $this.off.apply($this, arguments);
};

const publishModelEvent = function (eventName, model) {
    this.publishEvent(eventName, {model: model});
};

const publishEvent = function (eventName, data) {
    this.publish($.Event(eventName, data));
};

const publish = function (event) {
    let trigger = triggerAll;

    if (Config.DEBUG && console.group) {
        trigger = logEvents(trigger);
    }

    trigger.apply(this, arguments);
};

const triggerAll = function(event) {
    const $this = $(this);
    $this.trigger.apply($this, arguments);

    if (typeof event === 'string') {
        this.trigger.apply(this, arguments);
    } else if (typeof event === 'object') {
        /**
         * Without the namespace property, some listeners won't trigger their callbacks.
         * Eg. in "Module.click", the ".click" portion is the namespace, a separate property.
         * Using event.type by itself in this case would only produce "Module," so "Module.click" listeners won't react.
         * See http://api.jquery.com/on/#event-names
         */
        const eventName = event.namespace ? ([event.type, event.namespace]).join('.') : event.type;
        this.trigger(eventName, event);
    }
};

const logEvents = function(f) {
    return function(event) {
        const args = _.toArray(arguments);
        let event_name = event;

        // jQuery event
        if (typeof event === 'object' && 'type' in event) {
            event_name = event.type;
            console.group(event.type, event);
        }
        else if (args.length > 1) {
            console.group(args[0], args.slice(1));
        }
        else {
            console.group(args[0]);
        }

        if (debug.time_events) {
            f = functionTimer(event_name, f);
        }

        f.apply(this, arguments);

        console.groupEnd();
        return f;
    }
};

const functionTimer = function(text, f) {
    return function() {
        debug.time(text);
        const result = f.apply(this, arguments);
        debug.timeEnd();
        return result;
    }
};

export default _.extend({
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    publish: publish,
    publishEvent: publishEvent,
    publishModelEvent: publishModelEvent,
}, Backbone.Events);

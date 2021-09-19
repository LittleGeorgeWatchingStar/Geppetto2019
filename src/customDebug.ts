import {app} from 'app';
import * as _ from 'underscore';
import {model} from 'model';
import events from 'utils/events';

const debug = Object.create(null);
const labels = [];
const originalValueOf = Object.prototype.valueOf;

let activeElement = null;
let activeElementInterval = null;
let debug_time_events = false;

function watchFocus() {
    unwatchFocus();
    activeElement = document.activeElement;
    activeElementInterval = window.setInterval(() => {
        if (document.activeElement !== activeElement) {
            activeElement = document.activeElement;
            console.log('focus:', activeElement);
        }
    }, 100);
}

function unwatchFocus() {
    window.clearInterval(activeElementInterval);
    activeElement = null;
    activeElementInterval = null;
}

debug.time = function(label) {
    labels.push(label);
    console.time(label);
};

debug.timeEnd = function() {
    const label = labels.pop();
    console.timeEnd(label);
};

debug.timeline = function(label) {
    labels.push(label);
    (console as any).timeline(label);
};

debug.timelineStamp = function() {
    (console as any).timeStamp.apply(console, arguments);
};

debug.timelineEnd = function() {
    const label = labels.pop();
    (console as any).timelineEnd(label);
};

debug.trace = function() {
    console.groupCollapsed.apply(console, arguments);
    console.trace();
    console.groupEnd();
};

Object.defineProperty(debug, 'features', {
    get: () => app.workspace.get('debug_features'),
    set: (value) => app.workspace.set('debug_features', Boolean(value))
});

debug.publish = function() {
    events.publish.apply(events, arguments);
};

Object.defineProperty(debug, 'placed_modules', {
    get: () => model.design_revision.getPlacedModules()
});
Object.defineProperty(debug, 'design_revision', {
    get: () => model.design_revision
});
Object.defineProperty(debug, 'dimensions', {
    get: () => model.design_revision.dimensions
});
Object.defineProperty(debug, 'connections', {
    get: () => model.design_revision.connections
});
Object.defineProperty(debug, 'board', {
    get: () => model.design_revision.board
});
Object.defineProperty(debug, 'focus', {
    set: value => value ? watchFocus() : unwatchFocus()
});
Object.defineProperty(debug, 'time_events', {
    get: () => debug_time_events,
    set: value => debug_time_events = Boolean(value)
});

// This is the function the debugging console calls when asked to represent
// an object.
Object.prototype.valueOf = function() {
    if (Object.prototype.toString.call(this) === '[object Array]') {
        return _.map(this, elem => elem === undefined ? elem : elem.valueOf());
    }
    else {
        return originalValueOf.call(this);
    }
};

export default debug;

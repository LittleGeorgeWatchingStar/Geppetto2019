import * as $ from "jquery";

/**
 * Fake a jquery XHR with the given response data.
 */
export function fakeXhr(responseData) {
    const def = $.Deferred().resolve(responseData);
    return def.promise();
}

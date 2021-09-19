/*
 * Some functions that are not specific to any subsystem and used
 * by a number of controllers.
 */

/** NOTE: Phase this out! **/

import userController from 'auth/UserController';
import * as $ from 'jquery';
import events from 'utils/events';
import {USER_CHANGED} from "../auth/events";


/**
 * Load a blank design or a saved revision after the page has already
 * loaded.
 * TODO this looks like it belongs in a top level app view
 */
function updateLoggedIn() {
    const user = userController.getUser();
    if (user.isLoggedIn()) {
        $('body').attr('loggedin', '');
        $('#user-name').html(user.getFirstName() + ' ' + user.getLastName());
        $('#user-email').html(user.getEmail());
    } else {
        $('body').removeAttr('loggedin');
        $('#user-name').html(' ');
        $('#user-email').html(' ');
    }

    $('[group]').hide();
}

function init() {
    events.subscribe(USER_CHANGED, updateLoggedIn);
    updateLoggedIn();
}

export default {
    init : init
}

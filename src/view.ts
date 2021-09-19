import threeDModel from "3dboard/3DModel";
import * as Config from "Config";
import * as Cookies from "js-cookie";
import * as $ from "jquery";
import "jquery-ui-touch-punch";
import "lib/jquery-ui";
import events from "utils/events";
import {THEME} from "./toolbar/events";

function init() {

    threeDModel.init();
    events.subscribe(THEME, theme);

    checkTouchMode();
}

function checkTouchMode() {
    const touchSupported = 'ontouchend' in document;
    if (!touchSupported) {
        return;
    }

    $('body').addClass('touch-mode-js');
}

function setTheme(theme) {
    const href = `${Config.CSS_URL}/themes/${theme}.css`;
    if ($('link[name="theme"]').attr('href') === href) {
        return;
    }

    const newThemeLink = $(`<link name="theme" rel="stylesheet" href="${href}">`);
    $('head').append(newThemeLink);
    newThemeLink.one('load', () => {
        $(`link[name="theme"]:not([href="${href}"])`).remove();
    });
}

function theme(event) {
    setTheme(event.name);
    Cookies.set('theme', event.name, {expires: 10000, sameSite: 'lax'});
}

export default {
    init: init,
    setTheme: setTheme
}

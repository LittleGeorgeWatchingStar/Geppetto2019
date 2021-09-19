/*!
 * © 2014 Gumstix, Inc. All rights reserved.
 */
/**
 * The main entry point for Geppetto Web.
 */
import * as $ from 'jquery';
import controller, {removeLoader} from 'controller';
import * as Config from 'Config';
import * as Sentry from '@sentry/browser';
import 'core-js';
import {ServerConfigController} from "./core/server-config/server-config.controller";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {ServerConfigErrorComponent} from "./core/server-config/server-config-error.component";
import {PromotionController} from "./promotions/PromotionController";

ServerConfigController.init().then(serverConfig => {
    PromotionController.initConfig(serverConfig.promotion);

    const promotionHtml = PromotionController.getLoaderMessage();
    if (promotionHtml) {
        $('#loading .loader-promo').html(promotionHtml);
    }

    /**
     * Get a key from the authentication server
     */
    $.ajax({
        dataType: "json",
        url: `${Config.API_URL}/api/v3/auth/current-user/`,
        xhrFields: {
            withCredentials: true,
        },
    }).done(response => {
        Sentry.init({
            dsn: Config.SENTRY_DSN,
            release: Config.RELEASE,
        });
        const userData = typeof response.id !== 'undefined' ? response : {};
        if (response && response.email) {
            Sentry.configureScope(scope => {
                scope.setUser({
                    email: response.email,
                });
            });
        }
        controller.init(serverConfig, userData);
    }).fail(handleErrorResponse);
}).catch(() => {
    removeLoader();
    ReactDOM.render(<ServerConfigErrorComponent/>, document.querySelector('#body'));
});



/**
 * Handle Error Response in main entry point
 */
function handleErrorResponse (response) {
    if (response.status === 401) {
        window.location.href = `${Config.AUTH_URL}/logout/?next=${Config.API_URL}`;
    }
}

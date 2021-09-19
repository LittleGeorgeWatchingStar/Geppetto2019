/* global module */
module.exports = function() {
    "use strict";

    return {
        AUTH_URL: 'http://accounts.mystix.com',
        API_URL: 'http://geppetto.mystix.com',
        APP_URL: 'http://geppetto.mystix.com',
        WWW_URL: 'http://www.mystix.com',
        DEBUG: true,
        LOG_URL: '',
        STATIC_URL: 'http://geppetto.mystix.com',
        CSS_PATH: 'css/core',
        THEME_CSS_PATH: 'css/themes',
        CSS_URL: 'http://geppetto.mystix.com/css',
        RELEASE: 'debug',
        TRACKING_ID: null, //'UA-97117-14',
        EXPERIMENT_ID: null,
        HOTJAR_ID: null,
        ORIBI_ID: null,
        CHAT: false,
        SENTRY_DSN: '',
        AFFILIATE_SCRIPT: null,
        DEFAULT_THEME: 'geppetto',
        GENERAL_LOGO: 'geppetto_logo.png',
        PARTNER_NAME: 'Gumstix',
        PARTNER_ICON: 'gumstix_logo.png',
        PARTNER_FOOTER: 'logo.png',
        PARTNER_ENDORSEMENT: 'gumstix',
        PARTNER_COMMUNITY_ENDORSEMENT: 'community',
        PARTNER_TERMS_URL: 'https://www.gumstix.com/ordering/gumstix-terms-and-conditions/',
        PARTNER_PRIVACY_URL: 'https://www.gumstix.com/about-gumstix/privacy-policy/',
        GUMSTIX_PRICING: true,
        NOINDEX: true,
        AUTO_ENABLED_FLAGS: [
            'upverter.board.edit',
        ],
        FAVICON: 'favicon.ico',
        SHIPPING_INFO_URL: 'https://www.gumstix.com/ordering/geppetto-orders/',

        // TEMP CONFIGS
        PI_DAY_PROMO_START: '2020-03-08 00:00:00',
        PI_DAY_PROMO_END: '2020-05-01 00:00:00',
    };
};

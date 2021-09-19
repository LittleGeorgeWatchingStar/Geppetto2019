/* global module */
module.exports = function(release) {
    "use strict";

    return {
        AUTH_URL: 'https://accounts.gumstix.com',
        API_URL: 'https://geppetto.gumstix.com',
        APP_URL: `https://geppetto-static.s3.amazonaws.com/r${release}`,
        WWW_URL: 'https://www.gumstix.com',
        DEBUG: false,
        LOG_URL: 'https://993c64264de147f099ec3627338d9cd2@sentry.gumstix.com/3',
        STATIC_URL: `https://geppetto-static.s3.amazonaws.com/r${release}`,
        CSS_PATH: 'static/css',
        THEME_CSS_PATH: 'static/css/themes',
        CSS_URL: `https://geppetto-static.s3.amazonaws.com/r${release}/css`,
        RELEASE: release,
        TRACKING_ID: 'UA-97117-3',
        EXPERIMENT_ID: null,
        HOTJAR_ID: '1499493',
        ORIBI_ID: 'Xy0xNjIyODA5MTE0',
        CHAT: true,
        SENTRY_DSN: 'https://c28209e96d3d4584aaf151e8a1a64160@sentry.io/1312309',
        AFFILIATE_SCRIPT: `https://www.gumstix.com/wp-content/themes/gumstix-magento/scripts/affiliate.js?ver=${release}`,
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
        NOINDEX: false,
        AUTO_ENABLED_FLAGS: [
            'upverter.board.edit',
        ],
        FAVICON: 'favicon.ico',
        SHIPPING_INFO_URL: 'https://www.gumstix.com/ordering/geppetto-orders/',

        // TEMP CONFIGS
        PI_DAY_PROMO_START: '2020-03-14 00:00:00',
        PI_DAY_PROMO_END: '2020-05-01 00:00:00',
    }
};

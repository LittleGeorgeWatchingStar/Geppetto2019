/* global module */
module.exports = function(release) {
    "use strict";

    return {
        AUTH_URL: 'https://accounts.devstix.com',
        API_URL: 'https://geppetto.devstix.com',
        APP_URL: `https://dev-geppetto-static.s3.amazonaws.com/r${release}`,
        WWW_URL: 'https://www.devstix.com',
        DEBUG: false,
        LOG_URL: 'https://4663c93552f64e33868bdd5d296b09a6@sentry.gumstix.com/6',
        STATIC_URL: `https://dev-geppetto-static.s3.amazonaws.com/r${release}`,
        CSS_PATH: 'css/core',
        THEME_CSS_PATH: 'css/themes',
        CSS_URL:`https://dev-geppetto-static.s3.amazonaws.com/r${release}/css`,
        RELEASE: release,
        TRACKING_ID: 'UA-97117-11',
        EXPERIMENT_ID: null,
        HOTJAR_ID: null,
        ORIBI_ID: null,
        CHAT: false,
        SENTRY_DSN: 'https://8added3dfb424d248e09c0f3eef490db@sentry.io/1312353',
        AFFILIATE_SCRIPT: `https://www.devstix.com/wp-content/themes/gumstix-magento/scripts/affiliate.js?ver=${release}`,
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

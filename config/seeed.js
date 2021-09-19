/* global module */
module.exports = function(release) {
    "use strict";

    return {
        AUTH_URL: 'https://accounts.neostix.com',
        API_URL: 'https://geppetto.seeed.neostix.com',
        APP_URL: `https://dev-seeed-geppetto-static.s3.amazonaws.com/r${release}`,
        WWW_URL: 'https://seeedstudio.com',
        DEBUG: false,
        LOG_URL: 'e33868bdd5d296b09a6@sentry.gumstix.com/6',
        STATIC_URL: `https://dev-seeed-geppetto-static.s3.amazonaws.com/r${release}`,
        CSS_PATH: 'css/core',
        THEME_CSS_PATH: 'css/themes',
        CSS_URL:`https://dev-seeed-geppetto-static.s3.amazonaws.com/r${release}/css`,
        RELEASE: release,
        TRACKING_ID: 'UA-97117-8',
        EXPERIMENT_ID: null,
        HOTJAR_ID: '1499493',
        ORIBI_ID: 'Xy0xNjIyODA5MTE0',
        CHAT: false,
        SENTRY_DSN: 'https://012cb1ed30da4e43a2a7b9abbf57dc98@sentry.io/3579180',
        AFFILIATE_SCRIPT: null,
        DEFAULT_THEME: 'seeed',
        GENERAL_LOGO: 'seeed_logo.png',
        PARTNER_NAME: 'Seeed',
        PARTNER_ICON: 'seeed_logo.png',
        PARTNER_BACKGROUND: 'seeed_large.png',
        PARTNER_FOOTER: 'seeed_footer.png',
        PARTNER_ENDORSEMENT: 'gumstix',
        PARTNER_COMMUNITY_ENDORSEMENT: 'community',
        PARTNER_TERMS_URL: 'https://geppetto.seeed.neostix.com/eula/',
        PARTNER_PRIVACY_URL: 'https://www.seeedstudio.com/privacy_policy',
        GUMSTIX_PRICING: false,
        NOINDEX: false,
        AUTO_ENABLED_FLAGS: [
        ],
        FAVICON: 'seeed_favicon.ico',
        SHIPPING_INFO_URL: 'https://www.seeedstudio.com/orderinfo.html',

        // TEMP CONFIGS
        PI_DAY_PROMO_START: '2020-01-01 00:00:00',
        PI_DAY_PROMO_END: '2020-01-01 00:00:00',
    };
};

import * as $ from "jquery";
import * as Config from "Config";
import {Endorsement} from "../design/api";
import userController from "../auth/UserController";

export enum PartnerTheme {
    DEFAULT = 'geppetto',
    SEEED = 'seeed',
    RPI = 'rpi',
    ADLINK = 'adlink',
    ARDUINO = 'arduino'
}

const THEME_CONFIG = {
    rpi: {
        GENERAL_LOGO: 'rpi_logo.png',
        PARTNER_NAME: 'RPI',
        PARTNER_ICON: 'rpi_logo.png',
        PARTNER_FOOTER: 'RPi-Logo-Landscape-Reg-SCREEN.png',
        PARTNER_ENDORSEMENT: 'raspberry_pi',
        PARTNER_COMMUNITY_ENDORSEMENT: 'community',
        DESIGN_TEMPLATES_HEADER: 'Latest Raspberry Design Templates by Gumstix',
        OVERRIDE_FEATURED_TEMPLATES: [2620, 6292, 2364], // TODO: Server defined.
        CSS_THEME: 'rpi',
        RETURN_URL: null,
        SHIPPING_INFO_URL: null,
        FAVICON: 'rpi_favicon.ico',
    },
    adlink: {
        GENERAL_LOGO: 'adlink_logo.png',
        PARTNER_NAME: 'ADLINK',
        PARTNER_ICON: 'adlink_logo.png',
        PARTNER_FOOTER: 'adlink_footer.png',
        PARTNER_ENDORSEMENT: 'gumstix',
        PARTNER_COMMUNITY_ENDORSEMENT: 'adlink_community',
        DESIGN_TEMPLATES_HEADER: 'Latest ADLINK Design Templates',
        OVERRIDE_FEATURED_TEMPLATES: null, // TODO: Server defined.,
        CSS_THEME: 'default',
        RETURN_URL: 'https://www.ipi.wiki/',
        SHIPPING_INFO_URL: 'https://www.adlinktech.com/en/index',
        FAVICON: 'adlink_favicon.ico',
    },
    arduino: {
        GENERAL_LOGO: 'arduino_logo.png',
        PARTNER_NAME: 'ARDUINO',
        PARTNER_ICON: 'arduino_logo.png',
        PARTNER_FOOTER: 'arduino_footer.png',
        PARTNER_ENDORSEMENT: 'gumstix',
        PARTNER_COMMUNITY_ENDORSEMENT: 'community',
        DESIGN_TEMPLATES_HEADER: 'Latest ARDUINO Design Templates',
        OVERRIDE_FEATURED_TEMPLATES: null, // TODO: Server defined.,
        CSS_THEME: 'default',
        RETURN_URL: null,
        SHIPPING_INFO_URL: null,
        FAVICON: 'arduino_favicon.ico',
    }
};

export class ThemeController {
    private static instance: ThemeController;

    private theme: string;
    private general_logo: string;
    private partner_name: string;
    private partner_icon: string;
    private partner_footer: string;
    private partner_endorsement: Endorsement;
    private partner_community_endorsement: Endorsement;
    private design_templates_header: string;
    private override_featured_templates: number[] | null;
    private return_url: string | null;
    private shipping_info_url: string | null;

    public constructor() {
        this.theme = Config.DEFAULT_THEME;
        this.general_logo = Config.GENERAL_LOGO;
        this.partner_name = Config.PARTNER_NAME;
        this.partner_icon = Config.PARTNER_ICON;
        this.partner_footer = Config.PARTNER_FOOTER;
        this.partner_endorsement = Config.PARTNER_ENDORSEMENT;
        this.partner_community_endorsement = Config.PARTNER_COMMUNITY_ENDORSEMENT;
        this.design_templates_header = `Latest ${this.partner_name} Design Templates`;
        this.override_featured_templates = null;
        this.return_url = null;
        this.shipping_info_url = Config.SHIPPING_INFO_URL;
        const favicon_link = $('link[rel="icon"]');
        favicon_link.attr({href: `${Config.STATIC_URL}/image/icons/${Config.FAVICON}`});
    }

    public static getInstance(): ThemeController {
        if (!ThemeController.instance) {
            ThemeController.instance = new ThemeController();
        }

        return ThemeController.instance;
    }

    public resetDefault(): void {
        this.theme = Config.DEFAULT_THEME;
        this.general_logo = Config.GENERAL_LOGO;
        this.partner_name = Config.PARTNER_NAME;
        this.partner_icon = Config.PARTNER_ICON;
        this.partner_footer = Config.PARTNER_FOOTER;
        this.partner_endorsement = Config.PARTNER_ENDORSEMENT;
        this.partner_community_endorsement = Config.PARTNER_COMMUNITY_ENDORSEMENT;
        this.design_templates_header = `Latest ${this.partner_name} Design Templates`;
        this.override_featured_templates = null;
        this.return_url = null;
        this.shipping_info_url = Config.SHIPPING_INFO_URL;
        const link = $('link[name="theme"]');
        link.attr({href: `${Config.CSS_URL}/themes/${userController.theme()}.css`});
        $('#logo-black').attr("src", `${Config.STATIC_URL}/image/${Config.PARTNER_FOOTER}`);
        $('#logo-white').attr("src", `${Config.STATIC_URL}/image/${Config.PARTNER_FOOTER}`);
        const favicon_link = $('link[rel="icon"]');
        favicon_link.attr({href: `${Config.STATIC_URL}/image/icons/${Config.FAVICON}`});
    }

    public applyTheme(theme: string): void {
        if (theme in THEME_CONFIG) {
            const config = THEME_CONFIG[theme];
            this.theme = theme;
            this.general_logo = config.GENERAL_LOGO;
            this.partner_name = config.PARTNER_NAME;
            this.partner_icon = config.PARTNER_ICON;
            this.partner_endorsement = config.PARTNER_ENDORSEMENT;
            this.partner_community_endorsement = config.PARTNER_COMMUNITY_ENDORSEMENT;
            this.design_templates_header = config.DESIGN_TEMPLATES_HEADER;
            this.override_featured_templates = config.OVERRIDE_FEATURED_TEMPLATES;
            this.return_url = config.RETURN_URL;
            this.shipping_info_url = config.SHIPPING_INFO_URL;

            const footer = config.PARTNER_FOOTER;
            this.partner_footer = footer;

            if (config.CSS_THEME) {
                const link = $('link[name="theme"]');
                link.attr({href: `${Config.CSS_URL}/themes/${config.CSS_THEME}.css`});
            }

            if (config.FAVICON) {
                const link = $('link[rel="icon"]');
                link.attr({href: `${Config.STATIC_URL}/image/icons/${config.FAVICON}`});
            }
            /*
             * Partner Footer must be manually set here since the core body template must be
             * generated and assigned before a custom theme can be loaded.
             */
            $('#logo-black').attr("src", `${Config.STATIC_URL}/image/${footer}`);
            $('#logo-white').attr("src", `${Config.STATIC_URL}/image/${footer}`);
        }
    }

    public get THEME(): string {
        return this.theme;
    }

    public get GENERAL_LOGO(): string {
        return this.general_logo;
    }

    public get PARTNER_NAME(): string {
        return this.partner_name;
    }

    public get PARTNER_ICON(): string {
        return this.partner_icon;
    }

    public get PARTNER_FOOTER(): string {
        return this.partner_footer;
    }

    public get PARTNER_ENDORSEMENT(): Endorsement {
        return this.partner_endorsement;
    }

    public get PARTNER_COMMUNITY_ENDORSEMENT(): Endorsement {
        return this.partner_community_endorsement;
    }

    public get DESIGN_TEMPLATES_HEADER(): string {
        return this.design_templates_header;
    }

    public get OVERRIDE_FEATURED_TEMPLATES(): number[] | null {
        return this.override_featured_templates;
    }

    public get RETURN_URL(): string | null {
        return this.return_url;
    }

    public get SHIPPING_INFO_URL(): string | null {
        return this.shipping_info_url;
    }

    public getAvailableThemes(): string[] {
        const availableThemes = [];
        for (const theme in THEME_CONFIG) {
            availableThemes.push(theme);
        }
        return availableThemes;
    }
}

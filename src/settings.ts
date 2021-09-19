import {getExperimentVariation} from "./marketing/ABTest";

let settings: SystemSettings = null;

/**
 * Use this function to get the system settings.
 *
 * @param config The application config (eg, release.js, local.js)
 */
export function getSettings(config): SystemSettings {
    if (null === settings) {
        settings = makeSettings(config);
    }
    return settings;
}

function makeSettings(config): SystemSettings {
    return new DynamicSettings();
}

/**
 * Settings that apply to all users, configured by us.
 */
export interface SystemSettings {
    /**
     * Which category in the library panel should be open by default?
     *
     * @return the category name
     */
    readonly defaultOpenCategory: string;
}

/**
 * Hard-coded settings; useful for development environments.
 */
class StaticSettings implements SystemSettings {
    public readonly defaultOpenCategory = "Memory";
}

/**
 * Settings that draw their values from dynamic sources such as Google
 * Content Experiments, the server, etc.
 */
class DynamicSettings implements SystemSettings {
    private categories = ['COM Connectors', 'Sensors'];

    public get defaultOpenCategory() {
        const chosenVariation = getExperimentVariation();
        return this.categories[chosenVariation];
    }
}

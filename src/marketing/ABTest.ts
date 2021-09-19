/**
 * The variation selected by Google Content Experiments (cx).
 *
 * Defined in loader.handlebars.
 */
declare const chosenVariation;

/**
 * @return Whether content experiments are enabled.
 */
function isEnabled(): boolean {
    return typeof chosenVariation === 'number';
}

/**
 * @return the index number of the variation to test when running an A/B test.
 */
export function getExperimentVariation(): number {
    if (isEnabled()) {
        return chosenVariation;
    } else {
        return 0;
    }
}

/**
 * When Autodoc is clicked.
 */
export const AUTODOC = 'autodoc';

/**
 * When tutorial is toggled.
 */
export const TUTORIAL_TOGGLE = 'toggleTutorial';

/**
 * When AutoBSP is clicked.
 */
export const DEVICE_TREE = 'autobsp';

/**
 * When CAD Data is clicked.
 */
export const CAD_DATA = 'upverter_data';

/**
 * When the user clicks the Refocus toolbar button.
 */
export const REFOCUS = 'refocus';

/**
 * When the user clicks Help in the toolbar.
 */
export const HELP = 'help';

/**
 * When the user clicks the Open toolbar button.
 */
export const LOAD_DESIGN_DIALOG = 'loadDesignDialog';

/**
 * When the user changes the theme colour.
 */
export const THEME = 'theme';

/**
 * When the user clicks the 3D View button.
 */
export const PREVIEW3D = 'preview3D';

/**
 * When the user clicks Uprev.
 */
export const START_UPREV = 'design_revision.uprev';


export const POWER_FINDER = 'powerFinder';

/**
 * When any toolbar button has been clicked.
 */
export const TOOLBUTTON_CLICKED = 'toolbuttonClicked';

/**
 * Identifies the toolbutton that was clicked.
 */
export interface ToolbuttonEvent {
    title: string;
}
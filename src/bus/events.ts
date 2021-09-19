import {RequireBus} from "./RequireBus";
import {ExclusionSet} from "./exclusion/ExclusionSet";
import {ProvideBus} from "./ProvideBus";
import {DisconnectionWidgetOptions} from "../view/DisconnectionWidget";

/**
 * When a require bus has been selected.
 * @see SelectRequireEvent
 */
export const SELECT_REQUIRE = 'selectRequire';
export const SELECTED_REQUIRE_CONNECTION = 'selectedRequireConnection';

export const SELECT_BOM_OPTION = 'selectBomOption';

/**
 * When a provide bus has been selected.
 * @see SelectProvideEvent
 */
export const SELECT_PROVIDE = 'selectProvide';

export const MOUSEENTER_PROVIDE = 'mouseoverProvide';

export const MOUSELEAVE_PROVIDE = 'mouseoutProvide';

/**
 * When a provide incompatible to the currently-selected require has been selected.
 */
export const PROVIDE_ERROR = 'provideError';

export const REQUIRE_DOUBLE_CLICK = 'require.doubleClick';

export const REQUIRE_NO_CONNECT_CLICK = "require.noConnectClick";

export const EXCLUSION_SET_NO_CONNECT_CLICK = "exclusionSet.noConnectClick";

/**
 * When a require bus is selected.
 */
export interface SelectRequireEvent extends ModelEvent<RequireBus> {
}

export interface SelectProvideEvent extends ModelEvent<ProvideBus> {
}

export interface SelectExclusionSetEvent extends ModelEvent<ExclusionSet> {
}

export interface ProvideErrorEvent {
    options: DisconnectionWidgetOptions;

    // The clicked provide view, for positioning purposes.
    target: HTMLElement;
}

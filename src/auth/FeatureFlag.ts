export enum FeatureFlag {
    PATH_FINDER_PATHS_CONFLICT = 'pathFinder.pathsConflict',
    PATH_FINDER_PATHS_CONFLICT_METHOD_TOGGLE = 'pathFinder.pathsConflict.methodToggle',
    UPVERTER_BOARD_EDIT = 'upverter.board.edit',
    UPVERTER_MODULE_EDIT = 'upverter.module.edit',
    REQUIRE_CONNECT_ERROR_TOOLTIP = 'require_connect.error_tooltip',
    WORKSPACE_MULTI_VIEWS = 'workspace.multiViews',
    WORKSPACE_MODE = 'workspace.mode',
    WORKSPACE_MODE_MULTI_SELECT = 'workspace.mode.multiSelect',
    WORKSPACE_MODE_THREED = 'workspace.mode.threed',
    WORKSPACE_MODE_THREED_IMAGE = 'workspace.mode.threedImage',
    WORKSPACE_MODULE_DUPLICATE = 'workspace.module.duplicate',
    NEW_DASHBOARD_UI = 'newDashboard.ui',
    NEW_DASHBOARD_UI_AUTOPLAY = 'newDashboard.ui.designAutoplay',
    NEW_DASHBOARD_CATEGORES = 'newDashboard.showCategories',
    NEW_MODULE_LIBRARY_UI = 'newModuleLibrary.ui',
    NEW_PLAYGROUND_UI = 'newPlayground.ui',
    PARTNER_THEME_CONTROL = 'partner.themeControl'
}

export enum EngineeringToolFlag {
    CHAT_HIDE = 'chat.hide',
    MODULE_DEV_MUGR_HIDE = 'module.devMugr.hide',
}

export const AVAILABLE_FLAGS = Object.keys(FeatureFlag)
    .map(k => FeatureFlag[k as any]) as FeatureFlag[];

export const AVAILABLE_TOOL_FLAGS = Object.keys(EngineeringToolFlag)
    .map(k => EngineeringToolFlag[k as any]) as FeatureFlag[];

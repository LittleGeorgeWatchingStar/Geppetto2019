import * as React from "react";

export interface Tab {
    url: string;
    onOpen: (id?: number) => void;
    onClose: () => void;
    $el: JQuery;
}

export interface DesignsTab extends Tab {
    onModulesLoaded: () => void;
    showLink?: boolean;
    loadDesigns: () => PromiseLike<any>;
    openPreview: (id) => void;
    filterByModuleIds: (ids: string[]) => void;
    setMenuSelection: (menu: string) => void;
}

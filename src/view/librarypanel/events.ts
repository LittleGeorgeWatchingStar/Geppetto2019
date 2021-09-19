import {ServerID} from "../../model/types";

export const SHOW_IN_LIBRARY_CLICK = 'showInLibrary';

export interface ShowInLibraryEvent {
    moduleName: string;
    moduleId: ServerID;
}
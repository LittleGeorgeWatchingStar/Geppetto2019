import events from 'utils/events';
import {Library} from 'module/Library';
import {USER_CHANGED} from "../auth/events";
import {
    CUSTOMER_MODULE_SAVED, CUSTOMIZED_MODULE_DELETE,
    LIBRARY_UPDATED,
    LibraryEvent,
    ModuleEvent,
    SKULESS_MODULE_SAVED
} from "./events";
import errorHandler from "../controller/ErrorHandler";
import DialogManager from "../view/DialogManager";
import {Dialog as ErrorDialog} from "../view/Dialog";
import {ModuleFilterController} from "./filter/ModuleFilterController";

const library = new Library();

/**
 * TODO: RxJS Switch map would be nice here.
 */
let libraryFetch: Promise<Library> | null;

export class LibraryController {
    static load(onLoad: (library: Library) => void): void {
        events.subscribe(CUSTOMER_MODULE_SAVED, addToLibrary);
        events.subscribe(SKULESS_MODULE_SAVED, addToLibrary);
        events.subscribe(USER_CHANGED, onUserChanged);
        events.subscribe(CUSTOMIZED_MODULE_DELETE, removeFromLibrary);
        this.getLibraryAsync()
            .then(onLoad)
    }

    /**
     * @deprecated use {@see `getLibraryAsync`} instead.
     */
    static getLibrary(): Library | null {
        return library;
    }

    static getLibraryAsync(): Promise<Library> {
        if (!libraryFetch) {
            this.fetchLibrary();
        }
        return libraryFetch;
    }

    /**
     * Fetches library from the server.
     */
    static fetchLibrary(): Promise<Library> {
        libraryFetch = new Promise<Library>((resolve, reject) => {
            const params = {
                moduleFilter: ModuleFilterController.getInstance().filter.join(','),
                comModuleFilter: ModuleFilterController.getInstance().comFilter.join(','),
            };
            library.fetch({
                data: params,
            })
                .done(() => resolve(library))
                .fail(loadFailHandler)
                .fail(() => reject());
        });
        return libraryFetch;
    }

    static setLibraryFetch(newLibraryFetch: Promise<Library>): void {
        libraryFetch = newLibraryFetch;
    }
}

/**
 * {@see errorHandler.onFail()} is not very informative as to what failed,
 * especially when the library loads automatically when the app initiates, so
 * the user won't be able to correlate their actions with the error dialog.
 *
 * TODO: From a backbone fetch, so it doesn't have
 *  {@see ServerGateway.sessionHasExpired()} handling.
 */
function loadFailHandler(): void {
    DialogManager.create(ErrorDialog, {
        title: 'Error',
        html: 'Module Library could not be loaded.'
    }).alert();
}

/**
 * When the customer saves a new custom module or creates a SKU-less module
 * (forks a module), add it to the library.
 */
function addToLibrary(event: ModuleEvent) {
    library.add(event.model);
    publishLibraryUpdate();
}

/**
 * When the customer delete a new custom module
 */
function removeFromLibrary(event: ModuleEvent) {
    library.remove(event.model);
    publishLibraryUpdate();
}

/**
 * When the user finishes logging in or out, reload the library.
 *
 * TODO: If this fails the user gets to still see the library before the user
 *  change. This would be OK if the user was logging in (can't see customer
 *  module), but would be bad if the user was logging off (can see customer
 *  modules they are not suppose to see).
 *
 * TODO: There is a delay on the library updating, with no loading spinner.
 */
function onUserChanged() {
    LibraryController.fetchLibrary()
        .then(() => publishLibraryUpdate());
}

function publishLibraryUpdate() {
    events.publishEvent(LIBRARY_UPDATED, {
        library: library.clone(),
    } as LibraryEvent);
}

let openedDialogs = [];

/**
 * The DialogManager currently only serves dialogs that
 * extend AbstractDialog. They are dialogs that should not
 * overlap with each other since they are modal dialogs.
 *
 * @see AbstractDialog
 */
function create(dialogType, options) {
    const dialog = new dialogType(options);
    openedDialogs.push(dialog);
    return dialog;
}

function close(dialog) {
    openedDialogs = openedDialogs.filter(currDialog => {
        return currDialog !== dialog
    });
}

function hasOpenDialog(): boolean {
    return openedDialogs.length !== 0;
}

export default {
    create: create,
    close: close,
    hasOpenDialog: hasOpenDialog,
}
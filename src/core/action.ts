import {DESIGN_LOADED, DESIGN_NEW} from "../design/events";
import {ACTION_EXECUTED, ACTION_REVERSED} from "../placedmodule/events";
import eventDispatcher from "../utils/events";

/**
 * A function that takes an event and returns an Action.
 */
export type ActionFactory = (event) => Action;

const subscriptionActionFactories: ActionFactory[] = [];
const subscriptionFunctions: ((...args: any[]) => void)[] = [];

export const actions = {
    /**
     * Execute an Action when an event occurs.
     */
    subscribe: (eventName: string, factory: ActionFactory): void => {
        const eventFunction = event => {
            const action = factory(event);
            executeAction(action);
        };
        eventDispatcher.subscribe(eventName, eventFunction);

        subscriptionActionFactories.push(factory);
        subscriptionFunctions.push(eventFunction);
    },

    unsubscribe: (eventName: string, factory: ActionFactory): void => {
        const subscriptionIndex = subscriptionActionFactories.indexOf(factory);
        if (subscriptionIndex >= 0) {
            eventDispatcher.unsubscribe(eventName, subscriptionFunctions[subscriptionIndex]);
            subscriptionActionFactories.slice(subscriptionIndex, 1);
            subscriptionFunctions.slice(subscriptionIndex, 1);
        }
    },

    /**
     * Undoes the last ReversibleAction.
     */
    undo: function (): void {
        if (undoStack.isEmpty) {
            return;
        }
        const action = undoStack.pop();
        redoStack.push(action);
        action.reverse();
        eventDispatcher.publishEvent(ACTION_REVERSED);
    },

    redo: function (): void {
        if (redoStack.isEmpty) {
            return;
        }
        const action = redoStack.pop();
        undoStack.push(action);
        action.execute();
        eventDispatcher.publishEvent(ACTION_EXECUTED);
    },

    init: function (): void {
        eventDispatcher.subscribe(DESIGN_LOADED, () => {
            undoStack.clear();
            redoStack.clear();
        });
        eventDispatcher.subscribe(DESIGN_NEW, () => {
            undoStack.clear();
            redoStack.clear();
        });
    }
};


/**
 * Executes an action taken by the user.
 */
export interface Action {
    /**
     * NOTE: {@see AddModule.execute} return a promise.
     */
    execute(): void;
}

/**
 * A user action that can be undone.
 */
export interface ReversibleAction extends Action {
    reverse(): void;

    log: string;
}

/**
 * NOTE: {@see AddModule.execute} return a promise.
 */
export function executeAction(action: Action): void {
    if ('reverse' in action) {
        undoStack.push(action as ReversibleAction);
        if (!redoStack.isEmpty) {
            redoStack.clear();
        }
    }
    action.execute();
    eventDispatcher.publishEvent(ACTION_EXECUTED);
}

export interface ActionLogs {
    undo: string[],
    redo: string[],
}

export function getAllActionLogs(): ActionLogs {
    return {
        undo: undoStack.actions.map(a => a.log),
        redo: redoStack.actions.map(a => a.log)
    }
}


class Stack {
    private readonly MAX_SIZE = 20;
    private _actions: ReversibleAction[] = [];

    public push(action: ReversibleAction) {
        this._actions.push(action);
        if (this._actions.length > this.MAX_SIZE) {
            this._actions.shift(); // throw away the oldest item
        }
    }

    public get actions(): ReversibleAction[] {
        return this._actions.slice();
    }

    public get isEmpty(): boolean {
        return this._actions.length === 0;
    }

    public pop(): ReversibleAction {
        if (this.isEmpty) {
            throw 'Stack is empty!';
        }
        return this._actions.pop();
    }

    public clear(): void {
        this._actions = [];
    }
}

const redoStack = new Stack;
const undoStack = new Stack;
/*
 * Controller for the interactive tutorial system.
 */

import {ArrowView} from "tutorial/ArrowView";
import {TextboxView} from "tutorial/TextboxView";
import events from "utils/events";
import {EventManager} from "./EventManager";
import {TutorialEvent} from "./TutorialEvent";
import {TUTORIAL_TOGGLE} from "../toolbar/events";
import userController from "auth/UserController";
import {getTutorialEventGateway} from "./TutorialEventGateway";

let tutorialEvents: TutorialEvent[];
let textbox: TextboxView;
let arrow: ArrowView;
let manager: EventManager;

export default {
    init: function () {
        textbox = new TextboxView();
        arrow = new ArrowView();
        manager = new EventManager(events);

        events.subscribe(TUTORIAL_TOGGLE, toggleTutorialState);
        initTutorialState();
    }
}

function initTutorialState() {
    const user = userController.getUser();

    if (userController.isTutorialEnabled() && !user.isEngineer()) {
        refreshTutorialEvents();
    }
}

function toggleTutorialState() {
    userController.toggleTutorial();

    if (userController.isTutorialEnabled()) {
        refreshTutorialEvents();
    }
}

function refreshTutorialEvents() {
    const tutorialEventGateway = getTutorialEventGateway();
    tutorialEventGateway.getTutorialEvents().done((results: TutorialEvent[]) => {
        tutorialEvents = results;
        initEvents();
    });
}

function initEvents() {

    for (const tutorialEvent of tutorialEvents) {
        const trigger = tutorialEvent.getTrigger();

        events.subscribe(trigger, event => {
            const model = 'model' in event ? event.model : null;
            if (userController.isTutorialEnabled()) {
                tutorialEvent.executeIfActive(manager, model);
            }
        });
    }
}

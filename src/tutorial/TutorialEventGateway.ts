import {ServerGateway} from "../core/ServerGateway";
import {TutorialEvent} from "./TutorialEvent";

export interface TutorialEventGateway {
    getTutorialEvents(): JQuery.jqXHR<TutorialEvent[]>;
}

class DefaultGateway extends ServerGateway implements TutorialEventGateway {
    public getTutorialEvents(): JQuery.jqXHR<TutorialEvent[]> {
        return this.get('/api/v3/tutorial/tutorialevents/')
            .then(results => results.map(result => new TutorialEvent(result))) as JQuery.jqXHR<TutorialEvent[]>;
    }
}

export function getTutorialEventGateway(): TutorialEventGateway {
    return new DefaultGateway();
}

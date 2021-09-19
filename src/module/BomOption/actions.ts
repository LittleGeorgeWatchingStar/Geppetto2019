import {executeAction, ReversibleAction} from "../../core/action";
import {BomChoice, BomOption} from "./BomOption";
import {SELECT_BOM_OPTION} from "../../bus/events";
import events from 'utils/events';


/**
 * When the user changes a BOM choice.
 */
export class ChangeBom implements ReversibleAction {

    private previousChoice: BomChoice;

    constructor(private readonly bomOption: BomOption,
                private readonly newChoice: BomChoice) {
        this.previousChoice = bomOption.selected;
    }

    /**
     * Adds a ChangeBom action to the stack.
     */
    public static userSelect(bomOption: BomOption,
                             newChoice: BomChoice): void {
        executeAction(new ChangeBom(bomOption, newChoice));
    }

    get log(): string {
        return `Select ${this.newChoice.description} for ${this.bomOption.description}`;
    }

    execute(): void {
        this.newChoice.select();
        events.publish(SELECT_BOM_OPTION, this.newChoice);
    }

    reverse(): void {
        this.previousChoice.select();
        events.publish(SELECT_BOM_OPTION, this.previousChoice);
    }
}

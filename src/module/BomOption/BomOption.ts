import {ServerID} from "../../model/types";
import {BomChoiceResource, BomOptionResource} from "./api";


/**
 * A group of mutually exclusive options where one must be chosen, eg. the colour of an LED.
 */
export class BomOption {
    private readonly _choices: BomChoice[];
    private selectedChoice: BomChoice;

    constructor(private readonly resource: BomOptionResource) {
        this.selectedChoice = BomChoice.defaultChoice(this);
        const otherChoices = resource.choices.map(c => new BomChoice(c, this));
        this._choices = [this.selectedChoice].concat(otherChoices);
    }

    select(bomChoice: BomChoice): void {
        this.selectedChoice = bomChoice;
    }

    /**
     * Find a matching choice and select that one if available.
     * TODO the description matching handles cases where the module has been uprevved
     * and the old reference has become outdated, I think?
     */
    selectMatch(choice: BomOptionResource): boolean {
        const matchingChoice = this.choices.find(c => c.id === choice.id || c.description === choice.description);
        if (matchingChoice) {
            matchingChoice.select();
            return true;
        }
        return false;
    }

    get choices(): BomChoice[] {
        return this._choices.slice();
    }

    get selected(): BomChoice {
        return this.selectedChoice;
    }

    get description(): string {
        return this.resource.description;
    }

    get id(): ServerID {
        return this.resource.id;
    }

    get defaultChoiceLabel() {
        return this.resource.default_choice_label;
    }
}


/**
 * Wrapper API for a BomChoiceResource.
 */
export class BomChoice {

    constructor(public readonly resource: BomChoiceResource,
                private readonly bomOption: BomOption) {
    }

    public static defaultChoice(bomOption: BomOption): BomChoice {
        return new BomChoice({
            option: bomOption.id,
            id: null,
            description: bomOption.defaultChoiceLabel,
            model_file: null,
            change_in_price: '0',
            changes: [],
            ortho_image_url: '',
        }, bomOption);
    }

    select(): void {
        this.bomOption.select(this);
    }

    get isSelected(): boolean {
        return this.bomOption.selected === this;
    }

    get description(): string {
        return this.resource.description;
    }

    get option(): ServerID {
        return this.resource.option;
    }

    /**
     * @see defaultChoice
     */
    get isDefault(): boolean {
        return null == this.id;
    }

    get id(): ServerID | null {
        return this.resource.id;
    }

    get price(): number {
        return parseFloat(this.resource.change_in_price);
    }

    get modelFile(): string {
        return this.resource.model_file;
    }

    get orthographicUrl(): string {
        return this.resource.ortho_image_url;
    }
}



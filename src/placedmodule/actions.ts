import {executeAction, ReversibleAction} from "../core/action";
import {PlacedModule} from "./PlacedModule";
import {PlacedModuleResource} from "./api";
import {DesignRevision} from "../design/DesignRevision";


export class RenamePlacedModule implements ReversibleAction {

    private readonly pmResource: PlacedModuleResource;
    private readonly design: DesignRevision;
    private readonly oldName: string;

    constructor(placedModule: PlacedModule,
                private readonly newName: string) {
        this.pmResource = placedModule.toResource();
        this.design = placedModule.designRevision;
        this.oldName = placedModule.customName;
    }

    get log(): string {
        return 'Rename Module';
    }

    static addToStack(placedModule: PlacedModule,
                      newName: string): void {
        executeAction(new RenamePlacedModule(placedModule, newName));
    }

    execute(): void {
        const pm = this.design.getPlacedModuleByUuid(this.pmResource.uuid);
        if (pm) {
            pm.setCustomName(this.newName);
        }
    }

    reverse(): void {
        const pm = this.design.getPlacedModuleByUuid(this.pmResource.uuid);
        if (pm) {
            pm.setCustomName(this.oldName);
        }
    }
}
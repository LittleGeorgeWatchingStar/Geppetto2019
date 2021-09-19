import {DesignRevision} from "../design/DesignRevision";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {RequireBus} from "../bus/RequireBus";
import {ProvideBus} from "../bus/ProvideBus";
import * as Config from "Config";

/**
 * Given a design revision, connect all placed modules such that:
 * 1) It establishes requires that only have one valid provider on board;
 * 2) Then all available priority connections;
 * 3) Then other needed requirements.
 */
export class ConnectionFinder {
    constructor(private readonly designRev: DesignRevision) {
    }

    public connectAll(): void {
        for (const pm of this.placedModules) {
            this.connectSingleProvider(pm);
        }
        for (const pm of this.placedModules) {
            this.connect(pm, true);
        }
        for (const pm of this.placedModules) {
            this.connect(pm, false);
        }
    }

    private connectSingleProvider(pm): void {
        for (const other of this.placedModules) {
            if (other.uuid === pm.uuid) {
                continue;
            }
            for (const require of pm.getRequires()) {
                if (require.isConnected()) {
                    continue;
                }
                let compatible = null;
                let numValidProvides = 0;
                for (const provide of other.getProvides()) {
                    if (provide.canBeConnectedTo(require)) {
                        compatible = provide;
                        ++numValidProvides;
                        if (numValidProvides > 1) {
                            break;
                        }
                    }
                }
                if (numValidProvides === 1) {
                    this.designRev.connectPair(require, compatible);
                    this.designRev.updateElectrical();
                }
            }
        }
    }

    private connect(pm: PlacedModule, priorityOnly: boolean): void {
        for (const other of this.placedModules) {
            if (other.uuid === pm.uuid) {
                continue;
            }
            for (const require of pm.getRequires()) {
                if (require.isConnected()) {
                    continue;
                }
                for (const provide of other.getProvides()) {
                    if (provide.canBeConnectedTo(require)) {
                        if (priorityOnly && !require.isHighPriority(provide)) {
                            continue;
                        }
                        this.designRev.connectPair(require, provide);
                        this.designRev.updateElectrical();
                        break;
                    }
                }
            }
        }
    }

    private get placedModules(): PlacedModule[] {
        return this.designRev.getPlacedModules();
    }
}
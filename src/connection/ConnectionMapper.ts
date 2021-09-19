import {PlacedModule} from "../placedmodule/PlacedModule";
import {Connection} from "./Connection";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {BusMapper} from "./BusMapper";
import {Bus} from "../bus/Bus";
import * as reconnectionLoggerTemplate from "templates/reconnection_logger";
import DialogManager from "../view/DialogManager";
import {Dialog} from "../view/Dialog";
import UserController from "../auth/UserController";


/**
 * When replacing a module with another, re-establish as many of the previous connections as possible.
 */
export class ConnectionMapper {

    private originalProvidedConnections: Connection[];
    private originalRequiredConnections: Connection[];
    private busMapper: BusMapper;

    constructor(private readonly replacement: PlacedModule,
                private readonly original: PlacedModule,
                private readonly logger: ReconnectionLogger = null) {
        this.originalProvidedConnections = this.original.providedConnections;
        this.originalRequiredConnections = this.original.requiredConnections;
        this.busMapper = new BusMapper();
    }

    public reconnect(): void {
        this.original.disconnect();
        this.reconnectProvides();
        this.reconnectRequires();
        const designRev = this.original.designRevision;
        designRev.recomputeFromConnections();
    }

    private reconnectProvides(): void {
        for (const connection of this.originalProvidedConnections) {
            const require = connection.requireBus;
            const provide = this.matchProvide(connection);
            if (provide) {
                provide.designRevision.connectPair(require, provide);
            }
            this.addLogEntry(connection.provideBus, provide, require);
        }
    }

    private reconnectRequires(): void {
        for (const connection of this.originalRequiredConnections) {
            const provide = connection.provideBus;
            const require = this.matchRequire(connection);
            if (require) {
                require.designRevision.connectPair(require, provide);
            }
            this.addLogEntry(connection.requireBus, require, provide);
        }
    }

    private addLogEntry(original: Bus, replacement: Bus | null, target: Bus): void {
        if (this.logger) {
            const isVLogic = replacement && replacement.implementsVlogicTemplate() || target.implementsVlogicTemplate();
            if (isVLogic && !UserController.getUser().isEngineer()) {
                return;
            }
            const replacementName = replacement ? replacement.name : null;
            this.logger.addEntry(original.name, replacementName, target.toString());
        }
    }

    /**
     * Find the replacement's RequireBus that most closely matches the previous module's RequireBus.
     */
    private matchRequire(connection: Connection): RequireBus | null {
        return this.busMapper.matchRequire(
            this.replacement,
            connection.requireBus.name,
            connection.provideBus
        );
    }

    /**
     * Find the replacement's ProvideBus that most closely matches the previous module's ProvideBus.
     */
    private matchProvide(connection: Connection): ProvideBus | null {
        return this.busMapper.matchProvide(
            this.replacement,
            connection.provideBus.name,
            connection.requireBus
        );
    }
}


/**
 * When re-establishing connections, generate a log to visualize the differences.
 */
export class ReconnectionLogger {

    private failed: { [name: string]: string }[];
    private differentReconnections: { [name: string]: string }[];
    private exactReconnections: { [name: string]: string }[];

    constructor(private readonly title: string) {
        this.failed = [];
        this.exactReconnections = [];
        this.differentReconnections = [];
    }

    public addEntry(original: string, replacement: string | null, target: string): void {
        if (replacement) {
            this.addSuccessfulEntry(original, replacement, target);
        } else {
            this.failed.push({
                original: original,
                replacement: '',
                target: target
            });
        }
    }

    public createDialog(): void {
        if (this.totalConnections === 0) {
            return;
        }
        const content = reconnectionLoggerTemplate({
            numSuccesses: this.numSuccesses,
            totalConnections: this.totalConnections,
            failures: this.failed,
            changes: this.differentReconnections,
            successes: this.exactReconnections
        });
        DialogManager.create(Dialog, {
            title: this.title,
            html: content,
            width: 600,
            height: 500,
            modal: false
        }).alert();
    }

    private get totalConnections(): number {
        return this.numSuccesses + this.failed.length;
    }

    private get numSuccesses(): number {
        return this.differentReconnections.length + this.exactReconnections.length;
    }

    private addSuccessfulEntry(original: string, replacement: string, target: string) {
        const entry = {
            original: original,
            replacement: replacement,
            target: target
        };

        if (original === replacement) {
            this.exactReconnections.push(entry);
        } else {
            this.differentReconnections.push(entry);
        }
    }
}

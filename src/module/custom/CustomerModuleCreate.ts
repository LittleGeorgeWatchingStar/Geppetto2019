import {CustomerBus, CustomerBusType} from "module/custom/CustomerBus";
import {AssignableNet} from "./AssignableNet";
import {Module} from "../Module";
import {CustomerBusData, CustomerModuleCreateData, getCustomerModuleGateway} from "./CustomerModuleGateway";
import {BusTemplate} from "./BusTemplate";
import {AssignableNetGroup} from "./AssignableNetGroup";
import {moduleToViewableData, ViewableModule} from "../PinPoint";
import {enumerateString} from "../../utils/StringEnumerator";

export interface CustomerModuleCreate {
    templateRevision: Module;
    name: string;
    description: string;
    requires: CustomerBus[];
    provides: CustomerBus[];
    voltageDomains: AssignableNetGroup[];
    getBuses: () => CustomerBus[];
    createBus: (busTemplate: BusTemplate, type: CustomerBusType) => CustomerBus;
    removeBus: (bus: CustomerBus) => void;
    findUnassignedBus: () => CustomerBus | undefined;
    validate(): string[];
    create(): JQuery.jqXHR<Module>;
    maxBuses: number;
    moduleViewData: ViewableModule;
}

export function createCustomerModuleCreate(templateRevision: Module): CustomerModuleCreate {
    let name: string = '';
    let description: string = '';
    const voltageDomains = templateRevision.getAssignableNets();
    /**
     * A Bus "belongs" to a Voltage Domain after one of its Signals has been assigned to a Net.
     * Ownership can be changed by reassigning the signals. Hence buses are stored here rather than in Voltage Domain.
     */
    let buses: CustomerBus[] = [];
    const maxBuses = (() => {
        let count = 0;
        voltageDomains.forEach(g => count += g.getNets().length);
        return count;
    })();

    function getRequireBuses(): CustomerBus[] {
        return buses.filter(bus => bus.type === CustomerBusType.REQUIRE);
    }

    function getProvideBuses(): CustomerBus[] {
        return buses.filter(bus => bus.type === CustomerBusType.PROVIDE);
    }

    function validate(): string[] {
        const errors = [];
        if (!name) {
            errors.push("Your module must have a name.");
        }
        const MAX_LENGTH = 500;
        if (description.length > MAX_LENGTH) {
            errors.push(`The description cannot be more than ${MAX_LENGTH} characters.`);
        }
        if (buses.length === 0) {
            errors.push("Your module must have at least one bus defined.");
        }
        return errors;
    }

    function getGroundNets(): string[] {
        const nets = [] as AssignableNet[];
        voltageDomains.forEach(domain => nets.push(...domain.getNets()));
        return nets.filter(net => net.isGround).map(net => net.value);
    }

    function toJSON(): CustomerModuleCreateData {
        const findOwningDomain = bus => voltageDomains.find(domain => domain.ownsBus(bus));
        const busToServer = (bus, domain: AssignableNetGroup) => {
            return {
                name: bus.name,
                busGroup: domain.id,
                nets: domain.filterNetsByBus(bus).map(net => net.toServer()),
                levels: domain.selectedLevels,
                milliwatts: bus.milliwatts,
            } as CustomerBusData
        };
        const requires = [];
        const provides = [];
        for (const bus of buses) {
            const domain = findOwningDomain(bus);
            if (!domain) {
                continue;
            }
            if (bus.type === CustomerBusType.REQUIRE) {
                requires.push(busToServer(bus, domain));
            } else {
                provides.push(busToServer(bus, domain));
            }
        }
        return {
            templateRevision: templateRevision.revisionId,
            name: name,
            description: description,
            requires: requires,
            provides: provides,
            groundNets: getGroundNets(),
        };
    }

    function create(): JQuery.jqXHR<Module> {
        return getCustomerModuleGateway().create(toJSON());
    }

    return {
        get templateRevision() {
            return templateRevision;
        },
        get name() {
            return name;
        },
        set name(newName: string) {
            name = newName.trim();
        },
        get description() {
            return description;
        },
        set description(newDescription: string) {
            description = newDescription.trim();
        },
        getBuses: () => buses,
        get requires() {
            return getRequireBuses();
        },
        get provides() {
            return getProvideBuses();
        },
        voltageDomains: voltageDomains,
        createBus: (busTemplate: BusTemplate, type: CustomerBusType) => {
            const existingNames = buses.filter(bus => bus.type === type).map(bus => bus.name);
            const enumerated = enumerateString(busTemplate.name, existingNames, '_');
            const bus = new CustomerBus(enumerated, busTemplate, type);
            buses.push(bus);
            return bus;
        },
        removeBus: (bus: CustomerBus) => {
            voltageDomains.forEach(domain => domain.removeAssignmentsFor(bus));
            buses = buses.filter(b => b.uuid !== bus.uuid);
        },
        findUnassignedBus: () => {
            return buses.find(bus => voltageDomains.every(domain => !domain.ownsBus(bus)));
        },
        validate: validate,
        create: create,
        maxBuses: maxBuses,
        moduleViewData: moduleToViewableData(templateRevision)
    }
}

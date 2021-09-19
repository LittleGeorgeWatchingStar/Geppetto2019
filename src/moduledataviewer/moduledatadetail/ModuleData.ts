import {FeatureCollection} from "../../module/feature/FeatureCollection";
import {generateUuid} from "../../utils/generateUuid";
import * as _ from "underscore";
import {Part} from "./part/Part";
import {CadSource} from "./cadsource/CadSource";
import {ServerID} from "../../model/types";
import {Module} from "../../module/Module";
import {BusGroupResource, BusResource} from "../../bus/api";
import {Cpu, CpuBall} from "./cpu/Cpu";
import {
    createEditableProvideTemplate,
    createEditableRequireTemplate,
    EditableProvideTemplate, EditableRequireTemplate
} from "./customizablebus/EditableBusTemplate";

/**
 * A subset of ModuleRevision properties.
 */
export interface ModuleData {
    id: ServerID;
    isFork: boolean;
    name: string;
    cadSource: CadSource;
    nets: string[];
    voltageDomains: BusGroupResource[];
    requireBuses: BusResource[];
    provideBuses: BusResource[];
    parts: Part[];
    cpu?: Cpu;

    /**
     * Used to look up which CPU balls are mapped to which signal assignments.
     * Only relevant on Provide Buses.
     * @see createEditableProvideTemplate
     */
    cpuBallNetMap: {[net: string]: CpuBall};
    features: FeatureCollection;
}

export interface EditableBus {
    id: ServerID | null; // An unsaved Bus has no ID.
    name: string;
    isPower: boolean;
    milliwatts: number;
    numConnections: number;
    voltageDomain: BusGroupResource;
}

export interface EditableRequireBus extends EditableBus {
    efficiency: number; // For power requires
    busTemplates: EditableRequireTemplate[];
}

export interface EditableProvideBus extends EditableBus {
    // Note: ProvideBus only ever has one BusTemplate
    busTemplates: EditableProvideTemplate[];
}


export function forkModule(module: Module,
                           cadSource: CadSource,
                           nets: string[],
                           parts: Part[]): ModuleData {
    const sortVoltageDomains = (voltageDomains: BusGroupResource[]) => {
        voltageDomains.sort((a, b) => a.title.localeCompare(b.title, undefined, {numeric: true}));
        return voltageDomains;
    };

    const sortbuses = (buses: BusResource[]) => {
        buses.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
        return buses;
    };
    const cpuBallNetMap = {};
    const cpu = module.cpu;
    if (cpu) {
        const findBall = (cpuBallId) => cpu.cpu_balls.find(cpuBall => cpuBall.id === cpuBallId);
        module.cpuBallToNetMappings.forEach(mapping =>
            cpuBallNetMap[mapping.net_name] = findBall(mapping.cpu_ball)
        );
    }
    return {
        id: module.getId(),
        isFork: !module.sku,
        name: module.name,
        cadSource: cadSource,
        requireBuses: sortbuses(module.requires),
        provideBuses: sortbuses(module.provides),
        voltageDomains: sortVoltageDomains(module.get('bus_groups')),
        parts: parts,
        nets: nets,
        cpu: module.cpu,
        cpuBallNetMap: cpuBallNetMap,
        features: new FeatureCollection(module.features),
    }
}

// TODO Ahauhauhuuehaue
export function forkModuleFork(name: string, data: ModuleData): ModuleData {
    const fork = _.clone(data);
    fork.name = name;
    fork.id = generateUuid();
    return fork;
}

export function convertToEditableRequire(bus: BusResource): EditableRequireBus {
    return Object.assign(convertToEditableBus(bus), {
        efficiency: bus.efficiency,
        busTemplates: bus.templates.map(t => createEditableRequireTemplate(t))
    });
}

export function convertToEditableProvide(bus: BusResource, ballNetMap): EditableProvideBus {
    return Object.assign(convertToEditableBus(bus), {
        busTemplates: bus.templates.map(t => createEditableProvideTemplate(t, ballNetMap))
    });
}

function convertToEditableBus(bus: BusResource): EditableBus {
    return {
        id: bus.id, // TODO clones
        name: bus.name,
        isPower: bus.power,
        milliwatts: bus.milliwatts,
        numConnections: bus.num_connections,
        voltageDomain: bus.bus_group,
    };
}


import {ServerID} from "../../../model/types";
import {
    createAssignableProvideSignal,
    createAssignableRequireSignal,
    RequireSignal, ProvideSignal
} from "./AssignableSignal";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {CpuBall} from "../cpu/Cpu";

export interface EditableBusTemplate {
    id: ServerID;
    name: string;
    isValid: () => boolean;
    assignableSignals: (ProvideSignal | RequireSignal)[];
}

export interface EditableProvideTemplate extends EditableBusTemplate {
    assignableSignals: ProvideSignal[];
}

export interface EditableRequireTemplate extends EditableBusTemplate {
    assignableSignals: RequireSignal[];
}

export function createEditableProvideTemplate(template,
                                              cpuBallNetMap: { [net: string]: CpuBall }): EditableProvideTemplate {
    const nets = template.nets ? template.nets.slice() : [];
    nets.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    const assignableSignals = nets.length > 0 ? loadExisting() : createNew();

    function loadExisting() {
        return nets.map(net => createAssignableProvideSignal({
            ballNetMap: cpuBallNetMap,
            templateId: net.signal_id,
            name: net.signal_name,
            value: net.value,
            ballMuxId: net.ball_mux || 'INVALID'
        }));
    }

    function createNew() {
        return template.signals.map(signal => createAssignableProvideSignal({
            ballNetMap: cpuBallNetMap,
            templateId: signal.id,
            name: signal.name,
            value: '',
            ballMuxId: null
        }));
    }

    return {
        id: template.id,
        name: template.name,
        isValid: () => assignableSignals.every(s => s.isValid()),
        assignableSignals: assignableSignals
    }
}


export function createEditableRequireTemplate(template): EditableRequireTemplate {
    const nets = template.nets ? template.nets.slice() : [];
    nets.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    const assignableSignals = nets.length > 0 ? loadExisting() : createNew();

    function loadExisting() {
        return nets.map(net => createAssignableRequireSignal({
            templateId: net.signal_id,
            name: net.signal_name,
            mandatory: net.signal_mandatory,
            value: net.value
        }));
    }

    function createNew() {
        return template.signals.map(signal => createAssignableRequireSignal({
            templateId: signal.id,
            name: signal.name,
            mandatory: signal.mandatory,
            value: ''
        }));
    }

    return {
        id: template.id,
        name: template.name,
        isValid: () => assignableSignals.every(s => s.isValid()),
        assignableSignals: assignableSignals
    }
}

import {ServerID} from "../../../model/types";
import {BusTemplate} from "../../../module/custom/BusTemplate";
import {BallMux, CpuBall} from "../cpu/Cpu";

export interface RequireSignalData {
    templateId: ServerID;
    name: string;
    mandatory: boolean;
    value: string | null;
}

interface AssignableSignal {
    templateId: ServerID;
    name: string;
    getValue: () => string | null;
    isValid: () => boolean;
    reassign: (val: string | null) => void;
}

export interface RequireSignal extends AssignableSignal {
    mandatory: boolean;
}

export function createAssignableRequireSignal(data: RequireSignalData): RequireSignal {
    let value = data.value;

    return {
        templateId: data.templateId,
        name: data.name,
        mandatory: data.mandatory,
        getValue: () => value,
        isValid: () => null !== value && '' !== value,
        reassign: (val: string | null) => value = val
    };
}

interface ProvideSignalData {
    ballNetMap: { [net: string]: CpuBall };
    templateId: ServerID;
    name: string;
    value: string;
    ballMuxId: ServerID | null;
}

export interface ProvideSignal extends AssignableSignal {
    setCpuBall: (ball: CpuBall | null) => void;
    setBallMux: (mux: BallMux | null) => void;
    getCpuBall: () => CpuBall | null;
    getBallMux: () => BallMux | null;
}

export function createAssignableProvideSignal(data: ProvideSignalData): ProvideSignal {
    let value = data.value;
    let cpuBall = data.ballNetMap[value] || null;
    let ballMux = null;
    if (cpuBall) {
        if (data.ballMuxId) {
            ballMux = cpuBall.ball_muxes.find(mux => mux.id === data.ballMuxId) || null;
        } else {
            ballMux = cpuBall.ball_muxes[0];
        }
    }

    return {
        templateId: data.templateId,
        name: data.name,
        getValue: () => value,
        isValid: () => Boolean(value && (cpuBall && ballMux || !cpuBall && !ballMux)),
        reassign: function (val: string | null) {
            if (val) {
                value = val;
                this.setCpuBall(data.ballNetMap[val] || null);
            } else {
                value = '';
                // CpuBall cannot exist without an assignment.
                this.setCpuBall(null);
            }
        },
        setCpuBall: (ball: CpuBall | null) => {
            cpuBall = ball;
            ballMux = cpuBall ? cpuBall.ball_muxes[0] : null;
        },
        setBallMux: (mux: BallMux | null) => {
            ballMux = mux
        },
        getCpuBall: () => cpuBall,
        getBallMux: () => ballMux
    };
}

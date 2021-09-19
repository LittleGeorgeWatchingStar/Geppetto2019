import {ServerID} from "../../../model/types";
import {BusResource} from "../../../bus/api";

/**
 * Server data for CPUs.
 * CPUs are only applicable to the Provides of a Module.
 * Specifying a CPU allows the user to assign CPU Balls and Ball Muxes to the Provides.
 */
export interface Cpu {
    id: ServerID;
    name: string;
    cpu_balls: CpuBall[];
}

export interface CpuBall {
    id: ServerID;
    cpu: string; // CPU name
    ball_number: string;
    trm_pin_name: string;
    register_address: string;
    bank: number | null;
    bank_index: number | null;
    ball_muxes: BallMux[];
}

export interface BallMux {
    id: ServerID;
    trm_signal: string;
    mux_mode: number;
    pin_direction: string;
}

/**
 * Data from the server for CPU balls assigned to nets.
 */
export interface CpuBallToNetMapping {
    cpu_ball: ServerID;
    net_name: string;
}

export interface PatchCpuBallToNetMappingsData {
    cpuBallToNetMappings: CpuBallToNetMappingData[];
}

/**
 * Data for sending CPU ball to net mappings to the server.
 */
export interface CpuBallToNetMappingData {
    cpuBall: ServerID;
    netName: string;
}

export interface CpuBallToNetMappingsReturnData {
    cpuBallToNetMappings: CpuBallToNetMapping[];
    provides: BusResource[];
}

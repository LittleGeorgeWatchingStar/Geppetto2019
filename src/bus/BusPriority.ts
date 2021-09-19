import {ServerID} from "../model/types";

/**
 * This emblem code indicates that the provide bus is not compatible with
 * the require bus.
 *
 * This is for cases where they are incompatible on a software level
 * (eg drivers), rather than a hardware level (eg, bus template, voltage level).
 */
export const CODE_NOT_COMPATIBLE = 'stop';


export interface BusPriority {
    priority: number;
    group: {
        id: ServerID,
        name: string
    };
    message: string;
    emblem: PriorityEmblem;
}

interface PriorityEmblem {
    id: ServerID;
    icon: string;
    title: string;
    code: string | null;
}

/**
 * Indicates that the provide bus is not compatible with the require bus.
 *
 * @todo: could be a method of an eventual BusPriority class.
 */
export function isStopPriority(priority: BusPriority): boolean {
    return priority
        && priority.emblem
        && priority.emblem.code === CODE_NOT_COMPATIBLE;
}

/**
 * True if at least one of the priorities in the list is a "stop" priority.
 */
export function containsStopPriority(priorities: BusPriority[]): boolean {
    return priorities.some(p => isStopPriority(p));
}

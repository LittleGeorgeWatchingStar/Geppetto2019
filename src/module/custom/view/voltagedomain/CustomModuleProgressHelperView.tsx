import * as React from "react";
import {CustomerBus} from "../../CustomerBus";
import {AssignableNetGroup} from "../../AssignableNetGroup";
import {CustomerModuleCreate} from "../../CustomerModuleCreate";


interface ProgressErrorProps {
    selectedBus: CustomerBus | null;
    onSelectDomain: (domain: AssignableNetGroup) => void;
    onSelectBus: (bus: CustomerBus) => void;
    selectedDomain: AssignableNetGroup;
    customerModuleCreate: CustomerModuleCreate;
}

/**
 * A view that states why the Net assignments of a Custom Module aren't valid.
 */
export function CustomModuleProgressHelperView(props: ProgressErrorProps): JSX.Element | null {
    const voltageDomains = props.customerModuleCreate.voltageDomains;

    function makeSelectBusNode(bus: CustomerBus): JSX.Element {
        if (bus === props.selectedBus) {
            return makeNameNode(bus.name);
        }
        return makeNameNode(bus.name, () => props.onSelectBus(bus));
    }

    function makeSelectDomainNode(domain: AssignableNetGroup): JSX.Element {
        if (domain !== props.selectedDomain) {
            return makeNameNode(domain.getPublicName(), () => props.onSelectDomain(domain));
        }
        return makeNameNode(domain.getPublicName());
    }

    function findErrorMessage(domain: AssignableNetGroup): JSX.Element {
        if (props.customerModuleCreate.getBuses().length === 0) {
            return <span>No pins assigned yet. Add an Input or Output Bus to get started.</span>;
        }
        const unassignedBus = props.customerModuleCreate.findUnassignedBus();
        if (unassignedBus === props.selectedBus) {
            return <span>Assign at least one signal from {makeSelectBusNode(unassignedBus)}.</span>;
        }
        if (unassignedBus) {
            return <span>The bus {makeSelectBusNode(unassignedBus)} is unused.</span>;
        }
        if (domain.hasNoPinsAssigned()) {
            if (domain !== props.selectedDomain) {
                return <span>{makeSelectDomainNode(domain)} has no assignment yet.</span>;
            }
            if (!unassignedBus) {
                return <span>Create a new Bus to assign signals to {makeSelectDomainNode(domain)}.</span>
            }
            return <span>Select a Bus or create a new one to assign signals to {makeSelectDomainNode(domain)}.</span>;
        }
        const busNeedsPower = domain.findBusNeedsPower();
        if (busNeedsPower) {
            const maxMw = domain.calculateMaximumMilliwattsFor(busNeedsPower);
            return <span>Input the power required by {makeSelectBusNode(busNeedsPower)} (0-{maxMw} mW).</span>;
        }
        if (domain.hasNoLevelSelected()) {
            return <span>At least one voltage level needs to be selected on {makeSelectDomainNode(domain)}.</span>;
        }
    }

    const error = findErrorMessage(props.selectedDomain);
    if (error) {
        return makeContainer(error, true);
    }
    for (const domain of voltageDomains) {
        const error = findErrorMessage(domain);
        if (error) {
            return makeContainer(error, true);
        }
    }
    return makeContainer(<span>This module is valid. Click Next Step to proceed.</span>, false);
}

function makeContainer(content: JSX.Element, hasError: boolean): JSX.Element {
    return (
        <p className={`progress-message ${hasError ? 'invalid' : 'complete'}`}>
            {content}
        </p>
    );
}

function makeNameNode(text: string, callback?: () => void): JSX.Element {
    if (callback) {
        return <span className="cta-link font-bold" onClick={callback}>{text}</span>;
    }
    return <span className="font-bold">{text}</span>;
}

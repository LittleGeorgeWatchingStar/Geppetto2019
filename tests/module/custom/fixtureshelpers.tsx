import {createCustomerModuleCreate, CustomerModuleCreate} from "../../../src/module/custom/CustomerModuleCreate";
import {DescribeCustomModule} from "../../../src/module/custom/view/DescribeCustomModuleView";
import {Module} from "../../../src/module/Module";
import {ModuleBuilder} from "../ModuleBuilder";
import {AssignableNetGroup} from "../../../src/module/custom/AssignableNetGroup";
import {AssignableNetGroupResource, BusTemplateResource} from "../../../src/module/custom/api";
import {BusTemplateGateway, getBusTemplateGateway} from "../../../src/module/custom/BusTemplateGateway";
import {BusTemplate} from "../../../src/module/custom/BusTemplate";
import * as React from "react";
import {AssignNetsView} from "../../../src/module/custom/view/AssignNetsView";

export function getAssignNetsView(customerModule?: CustomerModuleCreate,
                                  gateway?: BusTemplateGateway): JSX.Element {
    customerModule = customerModule || createCustomerModuleCreate(getMockedCustomModule());
    return <AssignNetsView onClickNext={() => {}}
                           customerModuleCreate={customerModule}
                           busTemplateGateway={gateway || getMockBusTemplateGateway()}/>;
}

export function getDescribeModuleView(customerModule?: CustomerModuleCreate): JSX.Element {
    return <DescribeCustomModule onSave={() => {}}
                                 customerModuleCreate={customerModule || createCustomerModuleCreate(getMockedCustomModule())}
                                 onClickBack={() => {}}/>
}

export function getMockedCustomModule(): Module {
    const module = new ModuleBuilder().build();
    module.isTemplateModule = () => true;
    spyOn(module, 'getAssignableNets').and.returnValue([
        new AssignableNetGroup({
            bus_group: 3763,
            bus_group_name: 'Baz',
            levels: [1, 2, 4],
            nets: [
                {value: 'PIN1', max_milliwatts: 1000},
                {value: 'PIN2', max_milliwatts: 1000},
                {value: 'PIN3', max_milliwatts: 1000},
                {value: 'PIN4', max_milliwatts: 1000}
            ]
        } as AssignableNetGroupResource)
    ]);

    spyOnProperty(module, 'pinpoints').and.returnValue([
        {net_name: 'PIN1', position: {x: 15, y: 20}},
        {net_name: 'PIN2', position: {x: 15, y: 50}},
        {net_name: 'PIN3', position: {x: 15, y: 80}},
        {net_name: 'PIN4', position: {x: 40, y: 35}},
    ]);
    return module;
}

/**
 * Mock the gateway request so that it "returns" a BusTemplate.
 * @param templateOptions: Customizations to default template fixture, partially implementing
 * @see BusTemplateResource
 */
export function getMockBusTemplateGateway(templateOptions?: object): BusTemplateGateway {
    const gateway = getBusTemplateGateway();
    const resource = {
        id: 5,
        name: 'PWM',
        public_name: 'PWM',
        signals: [
            {
                id: 6,
                name: "Swooty",
                mandatory: false
            },
            {
                id: 7,
                name: "Tooty",
                mandatory: false
            }
        ],
        power: false
    } as BusTemplateResource;
    if (templateOptions) {
        Object.assign(resource, templateOptions);
    }
    spyOn(gateway, 'getBusTemplates').and.callFake(() => {
        const deferred = $.Deferred();
        deferred.resolve([new BusTemplate(resource)]);
        return deferred;
    });
    return gateway;
}

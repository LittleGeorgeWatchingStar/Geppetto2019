import * as $ from "jquery";
import "lib/jquery-ui";
import {AbstractDialog} from "../../../view/Dialog";
import {Module} from "../../Module";
import {useState} from "react";
import {AssignNetsView} from "./AssignNetsView";
import {createCustomerModuleCreate, CustomerModuleCreate} from "../CustomerModuleCreate";
import {DescribeCustomModule} from "./DescribeCustomModuleView";
import {BusTemplateGateway, getBusTemplateGateway} from "../BusTemplateGateway";
import {DesignRevision} from "../../../design/DesignRevision";
import {Vector2D} from "../../../utils/geometry";
import eventDispatcher from "../../../utils/events";
import {CUSTOMER_MODULE_SAVED, ModulePlacementEvent} from "../../events";
import React = require("react");
import ReactDOM = require("react-dom");

interface CustomModuleDialogOptions extends Backbone.ViewOptions<Module> {
    model: Module;
    onSave: (savedModule: Module) => void;
    customerModuleCreate: CustomerModuleCreate;
    busTemplateGateway: BusTemplateGateway;
}

let dialog = null;

export function createCustomModuleDialog(module: Module,
                                       designRev: DesignRevision,
                                       position: Vector2D): void {
    // yuk
    const onSaveCustomModule = (savedModule: Module) => {
        dialog.close();
        dialog = null;
        eventDispatcher.publishEvent(CUSTOMER_MODULE_SAVED, {
            designRevision: designRev,
            model: savedModule,
            position: position,
        } as ModulePlacementEvent);
    };

    if (dialog) {
        dialog.close();
    }
    dialog = new CustomModuleDialog({model: module});
    ReactDOM.render(
        <ReactCustomModuleDialog onSave={onSaveCustomModule}
                                 customerModuleCreate={createCustomerModuleCreate(module)}
                                 busTemplateGateway={getBusTemplateGateway()}/>,
        dialog.el);
}

/**
 * The dialog that allows the user to create a custom module by
 * assigning signals to nets.
 */
export class CustomModuleDialog extends AbstractDialog<Module> {
    initialize(options: CustomModuleDialogOptions) {
        super.initialize(options);
        const dialogWidth = Math.min(1100, $(window).width() * 0.75);
        this.option({
            width: dialogWidth,
            height: Math.max(650, $(window).height() * 0.9),
        });
        this.title(`Custom Module (Beta): ${options.model.name}`);
        return this;
    }

    close() {
        super.close();
        dialog = null;
    }

    public get className(): string {
        return 'custom-module-dialog editable';
    }
}

interface ReactCustomModuleDialogProps {
    onSave: (module: Module) => void;
    customerModuleCreate: CustomerModuleCreate;
    busTemplateGateway: BusTemplateGateway;
}

enum CustomModuleDialogTabs {
    ASSIGN_NETS = 1,
    DESCRIBE_MODULE = 2
}

function ReactCustomModuleDialog(props: ReactCustomModuleDialogProps) {
    const [currentTab, setCurrentTab] = useState(CustomModuleDialogTabs.ASSIGN_NETS);

    function onProceedFromAssignNets(): void {
        setCurrentTab(CustomModuleDialogTabs.DESCRIBE_MODULE);
    }

    function onGoBackFromDescribe(): void {
        setCurrentTab(CustomModuleDialogTabs.ASSIGN_NETS);
    }

    return (
        <React.Fragment>
            {
                currentTab === CustomModuleDialogTabs.ASSIGN_NETS &&
                <div className='dialog-tab'>
                    <AssignNetsView onClickNext={onProceedFromAssignNets}
                                    customerModuleCreate={props.customerModuleCreate}
                                    busTemplateGateway={props.busTemplateGateway}/>
                </div>
            }
            {
                currentTab === CustomModuleDialogTabs.DESCRIBE_MODULE &&
                <div className='dialog-tab describe-module'>
                    <DescribeCustomModule customerModuleCreate={props.customerModuleCreate}
                                          onSave={props.onSave}
                                          onClickBack={onGoBackFromDescribe}/>
                </div>
            }
        </React.Fragment>
    );
}

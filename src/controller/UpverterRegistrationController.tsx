import UserController from "../auth/UserController";
import {AbstractDialog} from "../view/Dialog";
import * as React from "react";
import * as ReactDOM from "react-dom";
import DialogManager from "../view/DialogManager";
import {getClient} from "../core/HttpClient";

export class UpverterRegistrationController {

    private static instance: UpverterRegistrationController;

    private dialog: AbstractDialog<any> | null = null;

    public constructor() {}

    public static getInstance(): UpverterRegistrationController {
        if (!UpverterRegistrationController.instance) {
            UpverterRegistrationController.instance = new UpverterRegistrationController();
        }

        return UpverterRegistrationController.instance;

    }

    public static setInstance(instance: UpverterRegistrationController): void {
        this.instance = instance;
    }

    /**
     * Open registration/access request dialog.
     */
    public register(callback?: () => void): void {
        const user = UserController.getUser();
        if (!user.isLoggedIn()) {
            return;
        }

        if (this.dialog !== null) {
            this.dialog.close();
        }

        this.dialog = openRequestUpverterAccessDialog();

        const polling = setInterval(() => {
            $.getJSON('/api/v3/upverter/current-user/', auth => {
                if (auth.prompt_access_request === false) {
                    clearInterval(polling);
                    this.dialog.close();
                    callback();
                }
            });
        }, 2000);
    }
}

function openRequestUpverterAccessDialog(): AbstractDialog<any> {
    const dialog = DialogManager.create(RequestUpverterAccessDialog, {});
    ReactDOM.render(
        <RequestUpverterAccessDialogComponent email={UserController.getUser().getEmail()}
                                              closeDialog={() => dialog.close()}/>,
        dialog.el);
    return dialog;
}

class RequestUpverterAccessDialog extends AbstractDialog<any> {
    initialize(options) {
        super.initialize(options);
        this.option({
            width: 550,
            height: 360,
        });
        this.title('Upverter Link');
        return this;
    }
}

interface RequestUpverterAccessDialogComponentProps {
    email: string,
    closeDialog?: () => void,
}

interface RequestUpverterAccessDialogComponentState {
    requested: boolean;
}


export class RequestUpverterAccessDialogComponent
    extends React.Component<RequestUpverterAccessDialogComponentProps, RequestUpverterAccessDialogComponentState> {

    public constructor(props) {
        super(props);
        this.state = {
            requested: false,
        };
    }

    public onClickRequestAccess(): void {
        const client = getClient('text');
        client.post('/api/v3/upverter/request-geppetto-access', {}).then(() => {
            this.setState({
                requested: true,
            });
        });
    }


    public render(): React.ReactNode {
        const processMessage = (
            <div className="request-upverter-access-dialog-body">
                <p>Your request has been sent to Upverter, you will receive an email at
                     "{this.props.email}" with instructions on how to grant access to Geppetto.</p>
                <div className="request-button-div">
                    <button className="request-button"
                            onClick={this.props.closeDialog}>Close</button>
                </div>
            </div>
        );

        const requestMessage = (
            <div className="request-upverter-access-dialog-body">
                <h4>Your email is already used in an existing Upverter account</h4>
                <p>In order to use the Upverter view, you need to grant Geppetto access to
                your existing Upverter account "{this.props.email}"</p>
                <div className="request-button-div">
                    <button className="request-button"
                            onClick={() => this.onClickRequestAccess()}>Request Access</button>
                    <button className="request-button"
                            onClick={this.props.closeDialog}>Close</button>
                </div>
            </div>
        );

        return this.state.requested ? processMessage : requestMessage;
    }
}

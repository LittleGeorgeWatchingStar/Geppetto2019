import * as React from "react";
import {Module} from "../module/Module";


interface DeleteModuleDataConfirmationProps {
    dataToDelete: Module;
    onClickConfirm: () => void;
    onClickClose: () => void;
}

export class DeleteModuleDataConfirmation extends React.Component<DeleteModuleDataConfirmationProps> {
    constructor(props: DeleteModuleDataConfirmationProps) {
        super(props);
    }

    render(): JSX.Element {
        return (
            <section className="confirmation-window">
                <button type="button"
                        className="close-btn"
                        onClick={this.props.onClickClose}/>
                <h3>Delete {this.props.dataToDelete.name}</h3>
                <p>Are you sure? This action cannot be undone.</p>
                <div className="confirmation-window-actions">
                    <button className="cta"
                            onClick={this.props.onClickConfirm}>
                        Yes, delete
                    </button>
                    <button onClick={this.props.onClickClose}>
                        Cancel
                    </button>
                </div>
            </section>
        )
    }
}

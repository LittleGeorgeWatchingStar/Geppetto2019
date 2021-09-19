import {AbstractDialog} from "../../view/Dialog";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import * as connectionFileTransferTemplate from "templates/connection_dialog/connection_file_transfer";
import * as uploadCSVTemplate from "templates/connection_dialog/upload_csv";
import {ConnectionParser} from "./ConnectionParser";
import {SerializedConnector} from "./SerializedConnector";
import {ReconnectionLogger} from "../ConnectionMapper";
import UserController from "../../auth/UserController";
import {downloadString} from "../../utils/download";

let dialog = null;

export function openConnectionDialog(placedModule: PlacedModule): void {
    if (dialog) {
        dialog.close();
        dialog = null;
    }
    dialog = new ConnectionDialog({
        model: placedModule,
        modal: false
    });
}

/**
 * Dialog to visualize a placed module's current connections.
 * Conditionally offers options to upload and download CSV files for transferring connections.
 */
export class ConnectionDialog extends AbstractDialog<PlacedModule> {
    private placedModule: PlacedModule;

    initialize(options) {
        super.initialize(options);
        this.placedModule = options.model;
        this.$el.html(connectionFileTransferTemplate());
        this.title(`Connections: ${this.placedModule.customName}`);
        this.buttons({
            'Download CSV': () => this.download(),
            'Upload CSV': () => new UploadCSVDialog({
                model: this.placedModule,
                connectionDialog: this
            } as UploadCSVOptions),
            Close: this.close
        });
        this.render();
        return this;
    }

    render(): this {
        if (!this.showConnections()) {
            this.showEmptyMessage();
            this.disableDownload();
        }
        return this;
    }

    private download(): void {
        const parser = new ConnectionParser();
        const csv = parser.parseToCsv(this.placedModule);
        if (csv) {
            // Remove spaces from file name
            const fileName = `${this.placedModule}_connections.csv`.replace(/\s+/g, '');
            downloadString(csv, fileName, 'text/csv;charset=utf-8;');
        }
        this.close();
    }

    private disableDownload(): void {
        const downloadButton = this.getButton('Download CSV');
        downloadButton.prop('disabled', true).addClass('ui-state-disabled');
        downloadButton.attr('title', "There are no connections to download.");
    }

    private showConnections(): boolean {
        this.option({
            width: '500',
            height: '500'
        });
        const hasProvides = this.showProvidedConnections();
        const hasRequires = this.showRequiredConnections();
        return hasProvides || hasRequires;
    }

    private showEmptyMessage(): void {
        this.option({
            width: '500',
            height: '300'
        });
        this.$el.empty().append(
            `<div class="unavailable-container">
                <div>
                    <p>This module currently has no connections.</p>
                    <p>Tip: to reuse connections from another ${this.placedModule.name},
                    try uploading a CSV file downloaded from that module.</p>
                </div>
             </div>`
        );
    }

    /**
     * @returns {boolean} True if any required connection was shown.
     */
    private showRequiredConnections(): boolean {
        if (this.placedModule.requiredConnections.length === 0) {
            return false;
        }
        this.$('.receiving').append(
            `<thead>
                    <tr>
                        <td>Receiving</td>
                        <td>From module</td>
                        <td>Provided</td>
                    </tr>
                </thead>`
        );
        const isEngineer = UserController.getUser().isEngineer();
        for (const connection of this.placedModule.requiredConnections) {
            if (!isEngineer && connection.isVlogic) {
                continue;
            }
            const provideBus = connection.provideBus;
            const requireBus = connection.requireBus;
            this.$('.receiving').append(
                `<tr><td>${requireBus.name} </td>
                 <td>${provideBus.moduleName}</td>
                 <td>${provideBus.name}</td></tr>`
            );
        }
        return true;
    }

    /**
     * @returns {boolean} True if any provided connection was shown.
     */
    private showProvidedConnections(): boolean {
        if (this.placedModule.providedConnections.length === 0) {
            return false;
        }
        this.$('.providing').append(
            `<thead>
                    <tr>
                        <td>Providing</td>
                        <td>To module</td>
                        <td>Requirement</td>
                    </tr>
                </thead>`
        );
        const isEngineer = UserController.getUser().isEngineer();
        for (const connection of this.placedModule.providedConnections) {
            if (!isEngineer && connection.isVlogic) {
                continue;
            }
            const provideBus = connection.provideBus;
            const requireBus = connection.requireBus;
            this.$('.providing').append(
                `<tr><td>${provideBus.name}</td>
                 <td>${requireBus.moduleName}</td>
                 <td>${requireBus.name}</td></tr>`
            );
        }
        return true;
    }
}


interface UploadCSVOptions extends Backbone.ViewOptions<PlacedModule> {
    connectionDialog: ConnectionDialog;
}


export class UploadCSVDialog extends AbstractDialog<PlacedModule> {

    private placedModule: PlacedModule;
    // To close on successful upload:
    private connectionDialog: ConnectionDialog;
    private isUploading: boolean;

    initialize(options: UploadCSVOptions) {
        super.initialize(options);
        this.placedModule = options.model;
        this.connectionDialog = options.connectionDialog;
        this.displayDefault();
        this.buttons({
            'Submit': () => {
                this.uploadFile();
            },
            Cancel: this.close
        });
        this.triggerFileWindow();
        return this;
    }

    private triggerFileWindow(): void {
        this.$('input[type=file]').click();
    }

    private displayDefault(): void {
        this.isUploading = false;
        this.title('Upload CSV Connections');
        this.$el.html(uploadCSVTemplate());
    }

    private displayLoading(): void {
        this.isUploading = true;
        this.title('Uploading...');
        this.waiting();
    }

    private uploadFile(): void {
        const reader = new FileReader();
        const files = this.getUploadedFiles();
        const uploadError = this.validateUploadedConnections(files);
        if (uploadError.length > 0) {
            this.displayError(uploadError);
            return;
        }
        this.displayLoading();
        const csvBlob = files[0].slice();
        reader.onload = () => this.makeConnections(reader);
        reader.onerror = () => {
            this.displayError("Sorry, could not upload file.");
        };
        reader.readAsText(csvBlob);
    }

    private displayError(errorMessage: string): void {
        if (this.isUploading) {
            this.displayDefault();
        }
        this.$('.error').html(errorMessage);
    }

    private getUploadedFiles(): File[] {
        const fileInput = this.$el.find('#connection-csv')[0] as HTMLInputElement;
        /*
         * fileInput.files returns a FileList. We convert the FileList into an array of files.
         * This makes it easier to test since FileList is readonly and cannot be mocked or
         * initialized with a list of files.
         */
        return Array.from(fileInput.files);
    }

    private validateUploadedConnections(fileList: File[]): string {
        if (fileList.length === 0) {
            return 'Please choose a file.'
            /* Ideally, we would use File.type, which is set by browsers.
             * However, browsers such as Edge don't have a mime-type for
             * '.csv', so we have to check the extension manually.
             */
        } else if (this.getFileExtension(fileList[0].name) !== 'csv') {
            return 'Only CSV files can be uploaded.';
        }
        return '';
    }

    private getFileExtension(fileName: string): string {
        return fileName.split('.').pop();
    }

    private makeConnections(reader: FileReader): void {
        if (typeof reader.result !== 'string') {
            this.displayError('Invalid CSV file.');
        }

        const parser = new ConnectionParser();
        const serializedConnections = parser.csvToSerialized(reader.result as string);
        if (null === serializedConnections) {
            this.displayError('Invalid CSV. One or more fields are missing.');
            return;
        }
        const logger = new ReconnectionLogger(`Connected ${this.placedModule.customName}`);
        const csvConnector = new SerializedConnector(
            this.placedModule,
            serializedConnections,
            logger
        );
        csvConnector.connect();
        logger.createDialog();
        this.close();
        this.connectionDialog.close();
    }
}
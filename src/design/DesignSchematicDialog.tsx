/**
 * The dialog for requesting design stitching.
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import {AbstractDialog, DialogOptions} from "../view/Dialog";
import {DesignRevision} from "./DesignRevision";
import {terminalState} from "./DesignRevisionGateway";
import {SchematicInfo} from "../controller/Schematic";
import {DesignEagleJob, JobState} from "./DesignEagleJob";
import {ImagesViewerComponent} from "../imagesviewer/ImagesViewerComponent";

export interface DesignSchematicDialogOptions extends DialogOptions<DesignRevision> {
    previewUrl: string;
    getStatus(): JQuery.jqXHR<DesignEagleJob>;
    requestStitch(): JQuery.jqXHR<DesignEagleJob>;
    getSchematicInfo(): JQuery.jqXHR<SchematicInfo>;
    downloadSchematic(): void;
}

export default class DesignSchematicDialog extends AbstractDialog<DesignRevision> {
    readonly checkStatusInterval = 1500;

    private state: JobState;
    private progress: number;
    private checkHandle: number;

    private previewUrl: string;

    private getStatus: () => JQuery.jqXHR<DesignEagleJob>;
    private requestStitch: () => JQuery.jqXHR<DesignEagleJob>;
    private getSchematicInfo: () => JQuery.jqXHR<SchematicInfo>;
    private downloadSchematic: () => void;

    private schInfo: SchematicInfo;

    public imageViewer;

    constructor(options: DesignSchematicDialogOptions) {
        super(options);
    }

    initialize(options: DesignSchematicDialogOptions): this {
        super.initialize(options);
        this.option({
            minWidth: 400,
            minHeight: 300,
            width: 800,
            height: 600,
            resizable: true,
            resize: this.resize,
            dialogClass: 'schematic-dialog',
        });

        this.$el.addClass('schematic-dialog-body');

        this.previewUrl = options.previewUrl;
        this.getStatus = options.getStatus;
        this.requestStitch = options.requestStitch;
        this.getSchematicInfo = options.getSchematicInfo;
        this.downloadSchematic = options.downloadSchematic;

        this.checkStatus();

        this.title('Design Schematic');

        this.resize();
        this.render();

        return this;
    }

    render(): this {
        this.$el.html('');
        switch (this.state) {
            case JobState.NONE:
                this.$el.html(`<p>Could not load schematic.</p>`);
                break;
            case JobState.PENDING:
            case JobState.RUNNING:
                this.$el.append(this.createSchematicPreviewEl());
                break;
            case JobState.FAILED:
                this.$el.html(`<p>Could not load schematic.</p>`);
                break;
            case JobState.FINISHED:
                this.$el.append(this.createSchematicPreviewEl());
                break;
            default:
                this.$el.append(this.createSchematicPreviewEl());
        }
        return this;
    }

    private resize() {
        if (!this.$el) {
            return;
        }
        this.$el.css({
            width: this.$el.width(),
            height: this.$el.height(),
        });
    }

    private createSchematicPreviewEl() {
        const $schPreview = $('<div>');

        let imageDatas = [];

        if (this.schInfo) {
            imageDatas = this.schInfo.sheets.map((sheetSummary, index) => {
                const sheetNumber = index + 1;
                const sheetUrl = `${this.previewUrl}${sheetNumber}/`;
                return {
                    url: sheetUrl,
                    title: sheetSummary.title,
                };
            });
        }

        this.imageViewer = ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas} />, $schPreview.get(0));
        return $schPreview;
    }

    private checkStatus() {
        this.getStatus()
            .then(designEagleJob => {
                this.state = designEagleJob.jobState;
                this.progress = designEagleJob.progress;
                if (this.checkHandle && terminalState(this.state)) {
                    clearInterval(this.checkHandle);
                } else if (!this.checkHandle && !terminalState(this.state)) {
                    this.checkHandle = window.setInterval(this.checkStatus.bind(this), this.checkStatusInterval);
                }

                if (this.state === JobState.FINISHED) {
                    this.fetchSchInfo();
                }

                this.render();
            });
    }

    private fetchSchInfo() {
        this.getSchematicInfo().then(
            schInfo => {
                this.schInfo = schInfo;
                this.render();
            },
            () => {
                this.close();
            });
    }

    private postJob() {
        this.requestStitch()
            .then(designEagleJob => {
                this.state = designEagleJob.jobState;
                this.progress = designEagleJob.progress;
                this.render();
                this.checkHandle = window.setInterval(this.checkStatus.bind(this), this.checkStatusInterval);
            });
    }

    close() {
        if (this.checkHandle) {
            clearInterval(this.checkHandle);
        }

        super.close();
    }

    open(): this {
        return this;
    }
}
import * as React from "react";
import * as ReactDOM from "react-dom";
import {AbstractDialog, DialogOptions} from "../view/Dialog";
import {SchematicInfo} from "../controller/Schematic";
import {Module} from "./Module";
import {ImagesViewerComponent} from "../imagesviewer/ImagesViewerComponent";

export interface ModuleSchematicDialogOptions extends DialogOptions<Module> {
    previewUrl: string;
    getSchematicInfo(): JQuery.jqXHR<SchematicInfo>;
}

export default class ModuleSchematicDialog extends AbstractDialog<Module> {
    private previewUrl: string;
    private getSchematicInfo: () => JQuery.jqXHR<SchematicInfo>;

    private schInfo: SchematicInfo;

    public imageViewer;

    constructor(options: ModuleSchematicDialogOptions) {
        super(options);
    }

    initialize(options: ModuleSchematicDialogOptions): this {
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
        this.getSchematicInfo = options.getSchematicInfo;

        this.fetchSchInfo();

        this.title('Module Schematic');

        this.resize();
        this.render();

        return this;
    }

    render(): this {
        this.$el.html('');
        this.$el.append(this.createSchematicPreviewEl());

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

    private fetchSchInfo() {
        this.getSchematicInfo()
            .then(
                schInfo => {
                    this.schInfo = schInfo;
                    this.render();
                },
                () => {
                    this.close();
                });
    }
}
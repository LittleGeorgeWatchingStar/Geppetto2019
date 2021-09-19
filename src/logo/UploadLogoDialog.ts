import {Dialog} from "../view/Dialog";
import * as logoFileTransferTemplate from "templates/logo_file_transfer";
import {SvgCleaner} from "./SvgCleaner";
import {DesignRevision} from "../design/DesignRevision";
import {Vector2D} from "../utils/geometry";
import {AddNewLogo} from "./actions";

export class UploadLogoDialog extends Dialog {

    private designRev: DesignRevision;
    private modulePosition: Vector2D;

    initialize(options) {
        super.initialize(options);
        this.designRev = options.designRev;
        this.modulePosition = options.modulePosition;

        this.$el.find('input').focus();
        this.$el.html(logoFileTransferTemplate());

        this.title(`Add Logo`);
        this.option({width: '410'});
        this.buttons({
            'Upload Logo': () => {
                this.uploadFile()
            },
            Cancel: this.close
        });
        this.render();

        return this;
    }

    /**
     * The public visibility and Promise are for testing purposes.
     * The latter is due to FileReader being asynchronous.
     */
    public uploadFile(): Promise<any> {
        return new Promise(resolve => {
            const reader = new FileReader();
            const files = this.getUploadedFiles();
            const uploadError = this.validateSvgFile(files);
            if (uploadError.length > 0) {
                alert(uploadError);
                resolve();
                return;
            }
            const logoFile = files[0].slice();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    this.cleanSvg(reader.result);
                } else {
                    alert('Invalid SVG file.')
                }
                resolve();
            };
            reader.onerror = () => {
                alert(uploadError);
                resolve();
            };
            reader.readAsText(logoFile);
        });
    }

    private getUploadedFiles(): File[] {
        const fileInput = this.$el.find('#logo-svg')[0] as HTMLInputElement;
        /*
         * fileInput.files returns a FileList. We convert the FileList into an array of files.
         * This makes it easier to test since FileList is readonly and cannot be mocked or
         * initialized with a list of files.
         */
        return Array.from(fileInput.files);
    }

    /**
     * Check if the no file is uploaded. If a file was uploaded, check
     * if it's a svg file.
     */
    private validateSvgFile(fileList: File[]): string {
        if (fileList.length === 0) {
            return 'Please choose a file.';
        } else if (fileList[0].type !== 'image/svg+xml') {
            return 'Only SVG files can be uploaded.'
        }
        return '';
    }

    private cleanSvg(svgString: string): void {
        const svgCleaner = new SvgCleaner();
        svgCleaner.clean(svgString, (error, cleanSvgString) => {
            if (error) {
                alert(error);
                return;
            }
            this.close();
            AddNewLogo.addToStack(this.designRev, this.modulePosition, cleanSvgString);
        });
    }
}


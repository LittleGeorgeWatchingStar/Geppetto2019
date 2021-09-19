import * as React from "react";
import {Subscription} from "rxjs";
import {CompiledCadSourceJob} from "./CompiledCadSourceJob";
import {CompiledCadSourceJobController} from "./CompiledCadSourceJobController";
import {DesignRevision} from "../design/DesignRevision";
import {DesignController} from "../design/DesignController";
import * as CONFIG from "Config";
import {Analytics} from "../marketing/Analytics";


interface DownloadCadDialogComponentProps {
    designRevision: DesignRevision, // User cannot change the design when dialog is opened.
    closeDialog?: () => void,
}

interface DownloadCadDialogComponentState {
    job: CompiledCadSourceJob | null, // These are immutable.
    isJobOutOfDate: boolean,
    acceptedAgreement: boolean,
}


export class DownloadCadDialogComponent
    extends React.Component<DownloadCadDialogComponentProps, DownloadCadDialogComponentState> {

    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
        this.state = {
            ...this.fetchDownloadCadSourceJobControllerState(),
            acceptedAgreement: false
        };
        this.onClickSaveCompileDesign = this.onClickSaveCompileDesign.bind(this);
    }

    private fetchDownloadCadSourceJobControllerState() {
        return {
            job: CompiledCadSourceJobController.getInstance().job,
            isJobOutOfDate: CompiledCadSourceJobController.getInstance().isJobOutOfDate,
        }
    }

    public componentDidMount() {
        this.subscriptions.push(CompiledCadSourceJobController.getInstance().subscribe(() => {
            this.setState(this.fetchDownloadCadSourceJobControllerState);
        }));
    }

    public componentWillUnmount() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }


    // COMPILE + AUTO DOWNLOAD DESIGN BUTTON
    public onClickCompileDownloadDesign(): void {
        this.setState({
            acceptedAgreement: true,
        });
        Analytics.cadDownload.acceptLicense(this.props.designRevision.getDesignId());
        if (!this.compileDesignIsInProgress()) {
            if (this.state.isJobOutOfDate || !this.state.job) {
                CompiledCadSourceJobController.getInstance().startJob();
                this.triggerAutoDownloading();
            } else if (!this.props.designRevision.isDirty()) {
                this.onClickDownloadCompiledCad();
            }
        }
    }

    public onClickSaveCompileDesign() {
        DesignController.save();
        CompiledCadSourceJobController.getInstance().startJob();
        this.triggerAutoDownloading();
    }


    public triggerAutoDownloading(): void {
        setTimeout(() => {
            if (this.compileDesignIsInProgress()) {
                const pinOnCompiling = setInterval(() => {
                    this.compileDesignIsInProgress();
                    if (!this.compileDesignIsInProgress()) {
                        clearInterval(pinOnCompiling);
                        this.onClickDownloadCompiledCad();
                    }
                }, 10000);
            }
        }, 1500);
    }

    public compileDesignProgress(): number | null {
        const job = this.state.job;
        return (job && !job.isInFinalState) ? job.progress : null;
    }

    public compileDesignIsInProgress(): boolean {
        return this.compileDesignProgress() !== null;
    }


    // DOWNLOAD CAD BUTTON
    public onClickDownloadCompiledCad(): void {
        if (this.state.job) {
            const downloadUrl = this.state.job.downloadUrl;
            if (downloadUrl) {
                window.location.assign(downloadUrl);
                Analytics.cadDownload.filesDownloaded(this.props.designRevision.getDesignId());
            }
        }
    }

    public downloadCompiledCadError(): string | null {
        if (this.state.job) {
            if (this.state.job.isInFinalState) {
                const downloadUrl = this.state.job.downloadUrl;
                if (downloadUrl) {
                    return null;
                }
                Analytics.cadDownload.compileError(this.props.designRevision.getDesignId());
                return 'Error occurred during compilation, please compile design again.';
            }
            return 'Please wait for design to finish compiling.';
        }
        return 'Please compile design first.'
    }

    public render(): React.ReactNode {
        const agreement = (
            <div className="download-cad-dialog-body">
                <h3>License Agreement</h3>
                <p>
                    Subject to the <a href={CONFIG.PARTNER_TERMS_URL} target="_blank">Geppetto Service Terms and Conditions</a>,
                    Gumstix additionally grants you a non-exclusive,
                    worldwide royalty free perpetual (except for material breach) license to use, develop, commercialize,
                    create derivative works of and in any way modify those Eagle CAD files built by Gumstix in connection
                    with your Designs, which CAD files Gumstix will provide you upon request on the conditions that a)
                    under no circumstances shall Gumstix be liable to you for any direct, indirect, consequential or
                    incidental damages in connection with such CAD files; and b) you shall provide Gumstix with written
                    notice when you have commercialized Designs using such CAD files. Such CAD files are provided "as is,"
                    without any warranties or guarantees that they will be error free or will work as provided.  All
                    such CAD files are subject to the other terms and conditions set forth herein.
                </p>
                <p>
                    By clicking "Agree" you acknowledge and accept the above Terms and Conditions of the License you are
                    thereby granted.
                </p>
                <div className="download-button-div">
                    <button className="download-button-div-button" onClick={() => this.onClickCompileDownloadDesign()}>Agree</button>
                </div>
            </div>
        );

        const content = (
            <div className="download-cad-dialog-body">
                {this.compileDesignIsInProgress() &&
                <div className="compile-design-div">
                    <div className="content-container">
                        <h3>Compiling Design</h3>
                        <div className="progress">
                            <div className="bar" style={{width: this.compileDesignProgress() + '%'}}/>
                        </div>
                    </div>
                </div>
                }
                {this.props.designRevision.isDirty() && !this.compileDesignIsInProgress() &&
                <div className="compile-design-div">
                    <div className="content-container">
                        <h3>Compile Design</h3>
                        <p className="warning">Compiled CAD does not contain unsaved design changes.</p>
                        <div className="download-button-div">
                            <button onClick={this.onClickSaveCompileDesign}>Save & Compile</button>
                        </div>
                    </div>
                </div>
                }
                <div className="download-design-div">
                    {!this.downloadCompiledCadError() && !this.props.designRevision.isDirty() &&
                    <div>
                        <h3>Ready to Download</h3>
                        <p>Downloading starts in a few seconds.</p>
                    </div>
                    }
                    {!this.downloadCompiledCadError() && this.props.designRevision.isDirty() &&
                    <div>
                        <h3>Ready to Download</h3>
                        <p className="warning">Compiled CAD was created for the latest save.</p>
                    </div>
                    }
                    {this.compileDesignIsInProgress() &&
                    <h4>File will be downloaded automatically after compilation.</h4>
                    }
                </div>
                <div className="download-button-div">
                    {!this.props.designRevision.isDirty() &&
                    <button onClick={this.props.closeDialog}>Close</button>
                    }
                    {this.props.designRevision.isDirty() &&
                    <button onClick={() => this.onClickDownloadCompiledCad()}>Download CAD</button>
                    }
                </div>
            </div>
        );

        return this.state.acceptedAgreement ? content : agreement;
    }
}

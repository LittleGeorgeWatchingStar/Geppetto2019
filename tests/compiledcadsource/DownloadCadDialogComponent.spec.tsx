import * as React from "react";
import * as ReactDOM from "react-dom";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {CompiledCadSourceJobController} from "../../src/compiledcadsource/CompiledCadSourceJobController";
import * as ReactTestUtils from "react-dom/test-utils";
import {CompiledCadSourceJobBuilder} from "./CompiledCadSourceJobBuilder";
import {CompiledCadSourceJobState} from "../../src/compiledcadsource/CompiledCadSourceJob";
import {DownloadCadDialogComponent} from "../../src/compiledcadsource/DownloadCadDialogComponent";

describe("AnchorComponent", () => {
    let container;

    beforeEach(() => {
        CompiledCadSourceJobController.setInstance(new CompiledCadSourceJobController());

        document.body.innerHTML = '';
        container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);

        CompiledCadSourceJobController.getInstance().destructor();
    });

    describe('license agreement', () => {
        it('click agree starts render cad', () => {
            const startJobSpy = spyOn(CompiledCadSourceJobController.getInstance(), 'startJob');
            const design = new DesignRevisionBuilder().build();
            ReactDOM.render(<DownloadCadDialogComponent designRevision={design}/>, container);
            ReactTestUtils.Simulate.click(container.querySelector('.download-button-div-button'));
            expect(startJobSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('after license agreement', () => {
            describe('diaplay warning message', () => {
                it('when design is dirty', () => {
                    const design = new DesignRevisionBuilder().build();
                    spyOn(design, 'isDirty').and.returnValue(true);
                    ReactDOM.render(<DownloadCadDialogComponent designRevision={design}/>, container);

                    const warningMessage = container.querySelectorAll('.warning')[0];
                    expect(warningMessage).not.toBeNull();
                });
            });
            describe('progress', () => {
                it('does not show if no job', () => {
                    spyOnProperty(CompiledCadSourceJobController.getInstance(), 'job')
                        .and.returnValue(null);

                    const design = new DesignRevisionBuilder().build();
                    ReactDOM.render(<DownloadCadDialogComponent designRevision={design}/>, container);
                    const progress = container.querySelector('.progress');

                    expect(progress).toBeNull();
                });
                it('does not show if job is finished', () => {
                    const job = new CompiledCadSourceJobBuilder()
                        .withProgress(100)
                        .withState(CompiledCadSourceJobState.FINISHED)
                        .withDownloadUrl('https://i.am.rick.james/bitch')
                        .build();
                    spyOnProperty(CompiledCadSourceJobController.getInstance(), 'job')
                        .and.returnValue(job);

                    const design = new DesignRevisionBuilder().build();
                    ReactDOM.render(<DownloadCadDialogComponent designRevision={design}/>, container);

                    const progress = container.querySelector('.progress');

                    expect(progress).toBeNull();
                });
            });
    });
});
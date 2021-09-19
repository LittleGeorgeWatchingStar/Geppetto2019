import * as React from "react";
import * as ReactDOM from "react-dom";
import {CompiledCadDialogComponent} from "../../src/compiledcadsource/CompiledCadDialogComponent";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {CompiledCadSourceJobController} from "../../src/compiledcadsource/CompiledCadSourceJobController";
import {CompiledCadSourceJobBuilder} from "./CompiledCadSourceJobBuilder";
import {CompiledCadSourceJobState} from "../../src/compiledcadsource/CompiledCadSourceJob";

describe('CompiledCadDialogComponent', () => {
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

    describe('progress', () => {
        it('does not show if no job', () => {
            spyOnProperty(CompiledCadSourceJobController.getInstance(), 'job')
                .and.returnValue(null);

            const windowLocationAssign = jasmine.createSpy('assign');
            const design = new DesignRevisionBuilder().build();
            ReactDOM.render(<CompiledCadDialogComponent designRevision={design}
                                                        renderType={null}/>, container);

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

            const windowLocationAssign = jasmine.createSpy('assign');
            const design = new DesignRevisionBuilder().build();
            ReactDOM.render(<CompiledCadDialogComponent designRevision={design}
                                                        renderType={null}/>, container);

            const progress = container.querySelector('.progress');

            expect(progress).toBeNull();
        });
        it('shows if job is running', () => {
            const job = new CompiledCadSourceJobBuilder()
                .withProgress(69)
                .withState(CompiledCadSourceJobState.RUNNING)
                .withDownloadUrl(null)
                .build();
            spyOnProperty(CompiledCadSourceJobController.getInstance(), 'job')
                .and.returnValue(job);

            const windowLocationAssign = jasmine.createSpy('assign');
            const design = new DesignRevisionBuilder().build();
            ReactDOM.render(<CompiledCadDialogComponent designRevision={design}
                                                        renderType={null}/>, container);

            const progress = container.querySelector('.progress');

            expect(progress).not.toBeNull();
            expect(progress.querySelector('.bar').style.width).toEqual('69%');
        });
    });
});
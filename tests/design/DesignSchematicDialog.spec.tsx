import {DesignEagleJob, JobState} from "../../src/design/DesignEagleJob";
import SchematicDialog from "../../src/design/DesignSchematicDialog";
import {DesignEagleJobBuilder} from "./DesignEagleJobBuilder";
import {SchematicInfo} from "../../src/controller/Schematic";

describe("DesignSchematic dialog", () => {
    it("renders image viewer with no images when the job is running",
        (done) => {
        const promise = $.Deferred().resolve(
            new DesignEagleJobBuilder()
                .withJobState(JobState.RUNNING)
                .withOutput('progress: 0\nprogress: 20') // 20% progress.
                .build())
            .promise() as JQuery.jqXHR<DesignEagleJob>;
        const dialog = new SchematicDialog({
            previewUrl: '',
            getStatus: () => promise,
            requestStitch: () => $.Deferred().resolve(
                new DesignEagleJobBuilder()
                    .withJobState(JobState.PENDING)
                    .build())
                .promise() as JQuery.jqXHR<DesignEagleJob>,
            getSchematicInfo: () => $.Deferred().resolve(
                {
                    sheet_count: 0,
                    sheets: [],
                })
                .promise() as JQuery.jqXHR<SchematicInfo>,
            downloadSchematic: () => {},
        });

        promise.then(() => {
            expect(dialog.imageViewer).toBeDefined();
            // Image viewer will show a loading spinner when it has a
            // blank array for "imagesUrls"
            expect(dialog.imageViewer.props.imageDatas.length).toEqual(0);
            done();
        });
    });

    it("image viewer has correct data when job is finished",
        (done) => {
            const promise = $.Deferred().resolve(
                {
                    sheet_count: 3,
                    sheets: [
                        { title: 'TITLE 1' },
                        { title: 'TITLE 2' },
                        { title: 'TITLE 3' },
                    ],
                })
            .promise() as JQuery.jqXHR<SchematicInfo>;

            const dialog = new SchematicDialog({
                previewUrl: 'http://schematic.preview.url/',
                getStatus: () => $.Deferred().resolve(
                    new DesignEagleJobBuilder()
                        .withJobState(JobState.FINISHED)
                        .build())
                    .promise() as JQuery.jqXHR<DesignEagleJob>,
                requestStitch: () => $.Deferred().resolve(
                    new DesignEagleJobBuilder()
                        .withJobState(JobState.FINISHED)
                        .build())
                    .promise() as JQuery.jqXHR<DesignEagleJob>,
                getSchematicInfo: () => promise,
                downloadSchematic: () => {},
            });

            promise.then(() => {
                // setTimeout so it checks after changes have been rendered.
                setTimeout(() => {
                    expect(dialog.imageViewer).toBeDefined();
                    expect(dialog.imageViewer.props.imageDatas.length).toEqual(3);
                    expect(dialog.imageViewer.props.imageDatas[0]).toEqual({
                        title: 'TITLE 1',
                        url: 'http://schematic.preview.url/1/',
                    });
                    expect(dialog.imageViewer.props.imageDatas[1]).toEqual({
                        title: 'TITLE 2',
                        url: 'http://schematic.preview.url/2/',
                    });
                    expect(dialog.imageViewer.props.imageDatas[2]).toEqual({
                        title: 'TITLE 3',
                        url: 'http://schematic.preview.url/3/',
                    });
                    done();
                });
            });
        });
});
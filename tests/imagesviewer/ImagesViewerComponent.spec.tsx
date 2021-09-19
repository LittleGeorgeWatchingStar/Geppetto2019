import * as ReactTestUtils from "react-dom/test-utils";
import {ImagesViewerComponent} from "../../src/imagesviewer/ImagesViewerComponent";
import * as React from "react";
import * as ReactDOM from "react-dom";

function createImageUrl(): string {
    return window.URL.createObjectURL(
        new Blob([
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" /></svg>'
        ], {type: 'image/svg+xml'})
    );
}

describe("Images Viewer", () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.body.innerHTML = '';
    });

    describe('browsing', () => {
        it('next button works', (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);

            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            // Wait for initial image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    loadCount++;
                    if (loadCount === 1) {
                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);
                        expect(imageEl.getAttribute('src')).toEqual(imageDatas[1].url);
                        done();
                    }
            });
        });
        it('next button does appear if there is no next image', (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);

            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            // Wait for image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                loadCount++;
                switch (loadCount) {
                    case 1: // Initial image.
                        const nextButton1 = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton1);
                        expect(imageEl.getAttribute('src')).toEqual(imageDatas[1].url);
                        break;
                    case 2: // Next image.
                        const nextButton2 = container.querySelector('.next');
                        expect(nextButton2).toBeNull();
                        done();
                        break;
                }
            });
        });
        it('prev button works', (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);

            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            // Wait for image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                loadCount++;
                switch (loadCount) {
                    case 1: // Initial image.
                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);
                        expect(imageEl.getAttribute('src')).toEqual(imageDatas[1].url);
                        break;
                    case 2: // Next image.
                        const prevButton = container.querySelector('.prev');
                        ReactTestUtils.Simulate.click(prevButton);
                        expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);
                        done();
                        break;
                }
            });
        });
        it('prev button does not appear if there is no prev image', (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);

            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            // Wait for initial image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    loadCount++;
                    if (loadCount === 1) {
                        const prevButton = container.querySelector('.prev');
                        expect(prevButton).toBeNull();
                        done();
                    }
            });
        });
    });
    describe('loading background', () => {
        it("appears initially before image is loaded", () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // CSS style has loading background.
            expect(imageContainerEl.style.background).toBe('');
        });
        it("does not appear after initial image is loaded", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for image to load.
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    // Inline style overwrites CSS loading background.
                    expect(imageContainerEl.style.background).toEqual('white');
                    done();
            });
        });
        it("loading background appears before next image is loaded", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for initial image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    loadCount++;
                    if (loadCount === 1) {
                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);
                        // CSS style has loading background.
                        expect(imageContainerEl.style.background).toEqual('');
                        done();
                    }
            });
        });
        it("loading background does not appear after next image is loaded", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    loadCount++;
                    switch (loadCount) {
                        case 1: // Initial image.
                            const nextButton = container.querySelector('.next');
                            ReactTestUtils.Simulate.click(nextButton);
                            break;
                        case 2: // Next image.
                            // Inline style overwrites CSS loading background.
                            expect(imageContainerEl.style.background).toEqual('white');
                            done();
                            break;
                    }
            });
        });
    });
    describe('image error', () => {
        it("appears on initial image error", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: 'http://localhost:9876/assets/something.jpg'
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for image to load.
            let loadCount = 0;
            spyOn(container.querySelector('img'), 'onload')
                .and.callThrough()
                .and.callFake(() => {
                    loadCount++;
                    if (loadCount === 1) {
                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);
                    }
                });

            let errorCount = 0;
            spyOn(container.querySelector('img'), 'onerror')
                .and.callThrough()
                .and.callFake(() => {
                    errorCount++;
                    if (errorCount === 1) {
                        expect(imageContainerEl.textContent).toContain('Could not load the image.');
                        done();
                    }
                });
        });
        it("appears on change image error", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: 'http://localhost:9876/assets/something.jpg'
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for image to load.
            let errorCount = 0;
            spyOn(container.querySelector('img'), 'onerror')
                .and.callThrough()
                .and.callFake(() => {
                    errorCount++;
                    if (errorCount === 1) {
                        expect(imageContainerEl.textContent).toContain('Could not load the image.');

                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);

                        expect(imageContainerEl.textContent).not.toContain('Could not load the image.');
                        done();
                    }
            });
        });
        it("does not appear when image is changed", (done) => {
            const imageDatas = [
                {
                    title: 'first',
                    url: 'http://localhost:9876/assets/something.jpg'
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageContainerEl = (container.querySelector('.image-container') as HTMLElement);

            // Wait for image to load.
            let errorCount = 0;
            spyOn(container.querySelector('img'), 'onerror')
                .and.callThrough()
                .and.callFake(() => {
                    errorCount++;
                    if (errorCount === 1) {
                        expect(imageContainerEl.textContent).toContain('Could not load the image.');

                        const nextButton = container.querySelector('.next');
                        ReactTestUtils.Simulate.click(nextButton);

                        expect(imageContainerEl.textContent).not.toContain('Could not load the image.');
                        done();
                    }
                });
        });
    });
    describe('contents panel', () => {
        it("show if there is more than 1 image", () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const contentsPanelEl = (container.querySelector('.contents-panel') as HTMLElement);

            expect(contentsPanelEl).not.toBeNull();
        });
        it("show if there is less than 1 image", () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const contentsPanelEl = (container.querySelector('.contents-panel') as HTMLElement);

            expect(contentsPanelEl).toBeNull();
        });
        it("show content titles", () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const contentsPanelEl = (container.querySelector('.contents-panel') as HTMLElement);

            const firstContent = contentsPanelEl.querySelectorAll('.content')[0];
            const secondContent = contentsPanelEl.querySelectorAll('.content')[1];

            expect(firstContent.textContent).toContain('first');
            expect(secondContent.textContent).toContain('second');
        });
        it('click on title changes image', () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);
            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            const contentsPanelEl = (container.querySelector('.contents-panel') as HTMLElement);
            const secondContent = contentsPanelEl.querySelectorAll('.content')[1];
            ReactTestUtils.Simulate.click(secondContent);
            expect(imageEl.getAttribute('src')).toEqual(imageDatas[1].url);
        });
        it('click on title of current image does not change image', () => {
            const imageDatas = [
                {
                    title: 'first',
                    url: createImageUrl()
                },
                {
                    title: 'second',
                    url: createImageUrl()
                },
            ];
            ReactDOM.render(<ImagesViewerComponent imageDatas={imageDatas}/>, container);

            const imageEl = (container.querySelector('img') as HTMLElement);
            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);

            const contentsPanelEl = (container.querySelector('.contents-panel') as HTMLElement);
            const firstContent = contentsPanelEl.querySelectorAll('.content')[0];
            ReactTestUtils.Simulate.click(firstContent);
            expect(imageEl.getAttribute('src')).toEqual(imageDatas[0].url);
        });
    });
});
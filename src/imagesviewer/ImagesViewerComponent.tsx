import * as React from "react";
import {Point} from "../utils/geometry";
import {RefObject} from "react";
import * as $ from "jquery";

const ZOOM_FACTOR = 1 / 10;

interface ImagesViewerProps {
    imageDatas: ImageData[];
}

interface ImageData {
    url: string;
    title: string;
}

interface ImageViewerState {
    imageIndex: number;
    loading: boolean;
    error: boolean;

    imageWidth: number;
    imageLeft: number;
    imageTop: number;

    contentsPanelWidth: number;
}

/**
 * Datum to coordinates is center of the images viewer element.
 */
export class ImagesViewerComponent extends React.Component<ImagesViewerProps, ImageViewerState> {

    private mouseTracking: Point;

    private readonly el: RefObject<HTMLDivElement>;
    private readonly contentsPanel: RefObject<HTMLDivElement>;
    private readonly imageContainer: RefObject<HTMLDivElement>;
    private readonly image: RefObject<HTMLImageElement>;

    constructor(props: ImagesViewerProps) {
        super(props);
        this.el = React.createRef<HTMLDivElement>();
        this.contentsPanel = React.createRef<HTMLDivElement>();
        this.imageContainer = React.createRef<HTMLDivElement>();
        this.image = React.createRef<HTMLImageElement>();
        this.state = {
            imageIndex: 0,
            loading: true,
            error: false,
            imageWidth: 0,
            imageLeft: 0,
            imageTop: 0,
            contentsPanelWidth: props.imageDatas.length > 1 ? 200 : 0,
        };
    }


    public componentDidMount() {
        if (this.contentsPanel.current) {
            $(this.contentsPanel.current as any).resizable({
                handles: 'e',
                containment: this.el.current,
                resize: () => this.onResizeContentsPanel(),
            });
        }
    }

    public componentWillUnmount() {
        if (this.contentsPanel.current) {
            $(this.contentsPanel.current as any).resizable('destroy');
        }
    }

    private onResizeContentsPanel() {
        const maxWidth = this.elRect.width - 10;
        this.setState({
            contentsPanelWidth: Math.min(this.contentsPanelRect.width, maxWidth)
        });
    }


    private get elRect(): ClientRect {
        return this.el.current.getBoundingClientRect();
    }

    private get contentsPanelRect(): ClientRect {
        return this.contentsPanel.current.getBoundingClientRect();
    }

    private get imageContainerRect(): ClientRect {
        return this.imageContainer.current.getBoundingClientRect();
    }

    private get imageRect(): ClientRect {
        return this.image.current.getBoundingClientRect();
    }


    private setImage = (index: number) => {
        if (this.state.imageIndex !== index) {
            this.setState({
                imageIndex: index,
                loading: true,
                error: false,
                imageWidth: 0,
                imageLeft: 0,
                imageTop: 0,
            });
        }
    };

    private prev = event => {
        event.stopPropagation();
        const newIndex = this.state.imageIndex - 1;
        if (newIndex >= 0) {
            this.setImage(newIndex);
        }
    };

    private next = event => {
        event.stopPropagation();
        const newIndex = this.state.imageIndex + 1;
        const imageCount = this.props.imageDatas.length;
        if (newIndex < imageCount) {
            this.setImage(newIndex);
        }
    };

    private onLoadImage = () => {

        const imageContainerWidth = this.imageContainerRect.width;
        const imageContainerHeight = this.imageContainerRect.height;
        const imageContainerRatio = imageContainerWidth / imageContainerHeight;

        let imageWidth;
        const imageRatio = this.image.current.naturalWidth / this.image.current.naturalHeight;
        if (imageRatio < imageContainerRatio) {
            imageWidth = imageRatio / imageContainerRatio * imageContainerWidth;
        } else {
            imageWidth = imageContainerWidth;
        }
        const imageHeight = imageWidth / imageRatio;

        const imageLeft = -imageWidth / 2;
        const imageTop = -imageHeight / 2;

        this.setState({
            loading: false,
            error: false,
            imageWidth: imageWidth,
            imageLeft: imageLeft,
            imageTop: imageTop,
        });
    };

    private onErrorImage = () => {
        this.setState({
            loading: false,
            error: true,
        });
    };


    private onDragStart = event => {
        event.stopPropagation();
        event.preventDefault();
    };

    private onMouseDown = event => {
        event.preventDefault();
        if (!this.state.loading) {
            this.mouseTracking = new Point(event.pageX, event.pageY);
            document.addEventListener('mousemove', this.onDocMouseMove);
            document.addEventListener('mouseup', this.onDocMouseUp);
        }
    };

    private onDocMouseMove = event => {
        if (this.mouseTracking) {
            const delta = new Point(
                event.pageX - this.mouseTracking.x,
                event.pageY - this.mouseTracking.y);

            if (event.buttons === 1 || event.buttons === 2 || event.buttons === 3) {
                this.moveImage(delta);
            }
        }

        this.mouseTracking = new Point(event.pageX, event.pageY);
    };

    private onDocMouseUp = event => {
        document.removeEventListener('mousemove', this.onDocMouseMove);
        document.removeEventListener('mouseup', this.onDocMouseUp);
    };

    private moveImage(delta: Point) {
        const imageContainerWidth = this.imageContainerRect.width;
        const imageContainerHeight = this.imageContainerRect.height;

        const imageLeft = this.state.imageLeft;
        const imageTop = this.state.imageTop;
        const imageWidth = this.state.imageWidth;
        const imageHeight = this.imageRect.height;

        let newImagesLeft = imageLeft + delta.x;
        let newImageTop = imageTop + delta.y;


        // Move restrictions.
        const newLeftEdge = newImagesLeft;
        const newRightEdge = newImagesLeft + imageWidth;
        const newTopEdge = newImageTop;
        const newBottomEdge = newImageTop + imageHeight;
        if (delta.x < 0 && newRightEdge < -imageContainerWidth / 2) {
            newImagesLeft = imageLeft;
        }
        if (delta.x > 0 && newLeftEdge > imageContainerWidth / 2) {
            newImagesLeft = imageLeft;
        }
        if (delta.y < 0 && newBottomEdge < -imageContainerHeight / 2) {
            newImageTop = imageTop;
        }
        if (delta.y > 0 && newTopEdge > imageContainerHeight / 2) {
            newImageTop = imageTop;
        }


        this.setState({
            imageLeft: newImagesLeft,
            imageTop: newImageTop,
        });
    }

    private onWheel = (event) => {
        event.preventDefault();
        if (!this.state.loading) {
            // Handle different mouse wheel events from different browsers.
            const delta = ((event.deltaY || -event.wheelDelta || event.detail) >> 10) || 1;

            const imageContainerX = this.imageContainerRect.left;
            const imageContainerY = this.imageContainerRect.top;
            const imageContainerWidth = this.imageContainerRect.width;
            const imageContainerHeight = this.imageContainerRect.height;

            const position = new Point(
                event.pageX - imageContainerX - imageContainerWidth / 2,
                event.pageY - imageContainerY - imageContainerHeight / 2);

            this.zoomImage(delta, position);
        }
    };

    private zoomImage(scrollDelta: number, position: Point) {
        const imageLeft = this.state.imageLeft;
        const imageTop = this.state.imageTop;
        const imageWidth = this.state.imageWidth;
        const imageHeight = this.imageRect.height;


        // Scale image.
        const deltaWidth =-scrollDelta * ZOOM_FACTOR * imageWidth;
        const deltaHeight = deltaWidth * imageHeight / imageWidth;

        const newWidth = imageWidth + deltaWidth;


        // Move image such that the datum of the scaling is where the pointer is.
        const deltaLeft = deltaWidth * (imageLeft - position.x) / imageWidth;
        const deltaTop = deltaHeight * (imageTop - position.y) / imageHeight;

        const newImagesLeft = imageLeft + deltaLeft;
        const newImagesTop = imageTop + deltaTop;


        // Max/min zoom.
        const imageContainerWidth = this.imageContainerRect.width;
        const maxImageWidth = imageContainerWidth * 10;
        const minImageWidth = imageContainerWidth * 0.5;

        if (deltaWidth > 0 && newWidth > maxImageWidth) {
            return;
        }
        if (deltaWidth < 0 && newWidth < minImageWidth) {
            return;
        }

        this.setState({
            imageWidth: newWidth,
            imageLeft: newImagesLeft,
            imageTop: newImagesTop,
        });
    }

    public render() {
        const contents = this.props.imageDatas.map((value, index) => {
            const classNames = ["content"];

            if (index === this.state.imageIndex) {
                classNames.push('selected');
            }

            return <li className={classNames.join(' ')}
                key={index}
                onClick={() => this.setImage(index)}>
                {index + 1}) {this.props.imageDatas[index].title}
            </li>;
        });

        return (
            <div className="images-viewer"
                 ref={this.el}>
                <div className="image-panel"
                     style={{
                         width: 'calc(100% - ' + this.state.contentsPanelWidth + 'px)'
                     }}>
                    <div className="image-container"
                         ref={this.imageContainer}
                         style={{
                             background: this.state.loading ? '' : 'white',
                         }}
                         onContextMenu={event => event.preventDefault()}
                         onDragStart={this.onDragStart}
                         onMouseDown={this.onMouseDown}
                         onWheel={this.onWheel}>
                        {this.props.imageDatas.length > 0 && !this.state.error &&
                            <div className="image-position-helper">
                                <img ref={this.image}
                                     src={this.props.imageDatas.length ? this.props.imageDatas[this.state.imageIndex].url : ''}
                                     style={{
                                         width: this.state.imageWidth + 'px',
                                         height: 'auto',
                                         marginTop: this.state.imageTop + 'px',
                                         marginLeft: this.state.imageLeft + 'px',
                                     }}
                                     onLoad={this.onLoadImage}
                                     onError={this.onErrorImage}/>
                            </div>
                        }
                        {this.state.error &&
                            <div className="error">
                                <div>Could not load the image.</div>
                            </div>
                        }
                        {this.props.imageDatas.length !== 0 &&
                            <div className="page-indicator">
                                <b>{this.state.imageIndex + 1}/{this.props.imageDatas.length}</b>
                            </div>
                        }
                        {this.state.imageIndex > 0 &&
                            <div className="prev-wrapper">
                                <div className="prev"
                                     onClick={this.prev}/>
                            </div>
                        }
                        {this.state.imageIndex < this.props.imageDatas.length - 1 &&
                            <div className="next-wrapper">
                                <div className="next"
                                     onClick={this.next}/>
                            </div>
                        }
                    </div>
                </div>
                {this.props.imageDatas.length > 1 &&
                    <div className="contents-panel"
                         ref={this.contentsPanel}
                         style={{
                             width: this.state.contentsPanelWidth + 'px',
                         }}>
                        <div className="contents-container">
                            <ol className="contents">
                                {contents}
                            </ol>
                        </div>
                    </div>
                }
            </div>
        )
    }
}
import * as Backbone from 'backbone';
import * as d3 from 'd3';
import {TUTORIAL_TEXT_HIDE, TUTORIAL_TEXT_SHOW} from "tutorial/events";
import events from 'utils/events';
import {Polyline, Vector2D} from "utils/geometry";
import {Board} from "../model/Board";
import {TutorialEvent} from "../tutorial/TutorialEvent";
import {DRAW_PATHS, RenderPathsEvent} from "./events";
import {Connection} from "./Connection";
import {BOARD_RESIZE_DRAGSTART} from "../design/events";
import {ConnectionPath} from "./ConnectionPath";

function colorStr(r, g, b, a = 0.2): string {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default class PathView extends Backbone.View<Board> {
    private svg;
    private messages: string[] = [];
    private errorRef: number = 1;

    initialize() {
        this.listenTo(events, BOARD_RESIZE_DRAGSTART, this.clearAll);
        this.listenTo(events, DRAW_PATHS, this.drawPaths);
    }

    drawPaths(event: RenderPathsEvent) {
        this.svg = d3.select('svg');
        this.clearAll();
        for (const path of event.paths) {
            this.drawPath(path);
        }
        this.showMessages();
    }

    private clearAll(): void {
        this.svg.selectAll("line.intersection").remove();
        this.svg.selectAll("polygon.limit").remove();
        this.svg.selectAll("text.error-reference").remove();
        this.svg.selectAll("path.rectangle").remove();
        this.svg.selectAll("line.intersect").remove();
        this.messages = [];
        this.errorRef = 1;
    }

    private drawPath(path: ConnectionPath): void {
        let color = colorStr(51, 255, 51); // green
        if (!path.isValid) {
            color = colorStr(255, 51, 51); // red
            this.drawSvgErrorWarning(path.start, 20, "limit", "red", this.errorRef, "error");
            this.drawSvgErrorWarning(path.end, 20, "limit", "red", this.errorRef, "error");
            this.errorRef += 1;
        }
        this.drawSvgRectangles(path.keepouts, color);

        if (path.isTooLong) {
            // this.drawSvgLine(path.start, path.end, 'gray', 'intersection');
            this.addLengthMessage(path);
        }

        const pointGroup = [];
        let innerPointSetIndex = 0;
        let innerPointSetCount = 0;
        /*
         * By default, the all collision points will form serval rectangle (4n) shades
         * therefore, splitting all the collision points into groups of 4 points.
         *
         * However, there are special case where the total collision points are not multiples of 4 (4n)
         * For this case, group all collision points into one array and draw the special shade
         */
        if (path.collisions.length % 4 === 0) {
            for (const point of path.collisions) {
                if (innerPointSetCount < 4) {
                    if (innerPointSetCount === 0) {
                        pointGroup.push([point]);
                    } else {
                        pointGroup[innerPointSetIndex].push(point);
                    }
                    innerPointSetCount += 1;
                } else {
                    pointGroup.push([point]);
                    innerPointSetCount = 1;
                    innerPointSetIndex += 1;
                }
            }
        } else {
            pointGroup.push(path.collisions);
        }

        /*
         * By rearranging the list, each shade will start from the bottom left point ->
         * -> top left ->  next top right -> next bottom right -> next next bottom right (if any)
         *
         * |->|
         * ↑  ↓  ↑
         * |  |->| (repeat pattern if any)
         */
        if (pointGroup && pointGroup.length > 0) {
            pointGroup.forEach(value => {
                //first time sort based on x value
                value.sort((p1, p2) => {
                    if (p1.x === p2.x) {
                        if (p1.y < p2.y) {
                            return -1;
                        } else {
                            return 1;
                        }
                    } else {
                        if (p1.x < p2.x) {
                            return -1;
                        }
                        return 1;
                    }
                });

                //second, sorting based on y value since x is already sorted
                let moveUp = true;
                value.sort((p1, p2) => {
                    // round before match check, there is chance one value is off 0.5
                    if (Math.round(p1.x) === Math.round(p2.x)) {
                        if (p1.y < p2.y) {
                            if (moveUp) return -1;
                            return 1;
                        } else {
                            if (moveUp) return 1;
                            return -1;
                        }
                    } else {
                        if (p1.y >= p2.y && moveUp) {
                            moveUp = false;
                        } else if (!moveUp) {
                            moveUp = true;
                        }
                    }
                });
            });

            pointGroup.forEach(value => {
                const totalPoints = value.length;
                value.reduce((p1, p2) => {
                    this.drawSvgOverlapLine(p1, p2, 'red', 'intersect');
                    return p2;
                });
                if (this.checkCloseLine(value[totalPoints - 1], value[0])) {
                    this.drawSvgOverlapLine(value[totalPoints - 1], value[0], 'red', 'intersect');
                }
            });
        }
    }

    private drawSvgLine(start: Vector2D,
                        end: Vector2D,
                        color: string,
                        className: string): void {
        this.svg.append("line")
            .style("stroke", color)
            .style("stroke-width", 3)
            .attr("class", className)
            .attr("x1", start.x)
            .attr("y1", this.boardHeight - start.y + 2 * this.boardY)
            .attr("x2", end.x)
            .attr("y2", this.boardHeight - end.y + 2 * this.boardY);
    }

    private get boardHeight(): number {
        return this.model.getHeight();
    }

    private get boardY(): number {
        return this.model.position.y;
    }

    private drawSvgErrorWarning(point: Vector2D,
                                size: number,
                                className: string,
                                color: string,
                                referenceNum: number,
                                message: string): void {
        const centerY = this.boardHeight - point.y + 2 * this.boardY;
        const poly = `${point.x},${centerY - size / 2} ${point.x - size / 2},${centerY + size / 2} ${point.x + size / 2},${centerY + size / 2}`

        this.svg
            .append("polygon")
            .attr("points", poly)
            .style("stroke", color)
            .style("stroke-width", 2)
            .style("fill", "rgb(255, 140, 140)")
            .attr("class", className)
            .attr("cx", point.x)
            .attr("cy", centerY)
            .append("svg:title")
            .text(message)
        this.svg
            .append("text")
            .text(referenceNum)
            .attr("font-size", "0.7rem")
            .attr("x", point.x)
            .attr("y", centerY + 8)
            .attr("class", "error-reference")
            .style("text-anchor", "middle");
    }

    private drawSvgOverlapLine(start: Vector2D,
                               end: Vector2D,
                               color: string,
                               className: string): void {
        this.svg.append("line")
            .style("stroke", color)
            .style("stroke-width", 1)
            .style("stroke-dasharray", ("4, 4"))
            .attr("class", className)
            .attr("x1", start.x)
            .attr("y1", this.boardHeight - start.y + 2 * this.boardY)
            .attr("x2", end.x)
            .attr("y2", this.boardHeight - end.y + 2 * this.boardY);
    }

    private drawSvgRectangles(rectangles: Polyline[], color: string): void {
        // Keeping this around because it is easier to debug with the individual keepouts rendered.
        // const lineFunction = d3.svg.line()
        //     .x(d => d.x)
        //     .y(d => d.y)
        //     .interpolate("linear");
        //
        // for (let rectangle of rectangles) {
        //     let dataPoints = [];
        //     for (let point of rectangle.points) {
        //         dataPoints.push({
        //             x: point.x,
        //             y: this.boardHeight - point.y + 2 * this.boardY
        //         });
        //     }
        //     this.svg.append("path")
        //         .attr("d", lineFunction(dataPoints))
        //         .attr("class", "rectangle")
        //         .attr("stroke", "none")
        //         .attr("fill", color);
        // }

        let d = '';
        for (const rectangle of rectangles) {
            for (let i = 0; i < rectangle.points.length; i++) {
                const point = rectangle.points[i];
                if (i === 0) {
                    d += 'M ';
                } else {
                    d += 'L ';
                }
                d += `${point.x} ${this.boardHeight - point.y + 2 * this.boardY} `
            }
        }
        this.svg.append('path')
            .attr('d', d)
            .attr("class", "rectangle")
            .attr("stroke", "none")
            .attr("fill", color);
    }

    private addLengthMessage(path: ConnectionPath): void {
        const min = (path.minLength / 10).toFixed(1);
        const max = (path.maxLength / 10).toFixed(1);
        const desc = this.describeConnection(path.connection);
        const msg = `The distance ${desc} must be between ${min} and ${max} mm.`;
        this.addMessage(msg);
    }

    private describeConnection(connection: Connection): string {
        const from = connection.providerName;
        const to = connection.requirerName;
        return `from ${from} to ${to}`;
    }

    private addMessage(message: string): void {
        this.messages.push(message);
    }

    private showMessages() {
        const messages = this.messages.join(' ').trim();
        if (messages !== '') {
            events.publishEvent(TUTORIAL_TEXT_SHOW, new TutorialEvent({
                text_top: '10',
                text_left: '60',
                html: messages
            }));
        } else {
            // Clear previous path errors.
            events.publish(TUTORIAL_TEXT_HIDE);
        }
    }

    private checkCloseLine(p1: Vector2D, p2: Vector2D): boolean {
        return p1.x === p2.x || p1.y === p2.y;
    }
}

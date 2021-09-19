import {PathFindNode} from "../path/PathFinder";
import {Polyline, Vector2D} from "../utils/geometry";

/**
 * Used by GridPathfinder to log attempts at finding a clear path
 * between two connected buses.
 */
export interface SolutionLogger {
    logResult(result: PathFindNode, runtime: number): void;
    logObstacles(obstacles: Polyline[]): void;
}

/**
 * A SolutionLogger that does nothing.
 */
export class NullLogger implements SolutionLogger {
    public logResult(result: PathFindNode, runtime: number): void {
        // no-op
    }
    public logObstacles(obstacles: Polyline[]): void {
        // no-op
    }
}

/**
 * A SolutionLogger that writes the result to the Javascript console.
 */
export class ConsoleLogger implements SolutionLogger {
    public logResult(result: PathFindNode, runtime: number): void {
        const yesNo = result.isComplete ? '' : 'no ';
        console.log(`${yesNo}path found in ${runtime}ms: ${result}`);
    }
    public logObstacles(obstacles: Polyline[]): void {
        // no-op
    }
}

/**
 * A SolutionLogger that renders attempted solutions as SVG files.
 *
 * Call .toString() to get the SVG output.
 */
export class SvgLogger implements SolutionLogger {
    private solutions: PathFindNode[] = [];
    private obstacles: Polyline[] = [];

    public logResult(result: PathFindNode, runtime: number): void {
        this.solutions.push(result);
    }

    logObstacles(obstacles: Polyline[]): void {
        this.obstacles = obstacles.slice();
    }

    public toString(): string {
        let output = `\n\n<svg viewBox="0 0 100 100">`
            + `<g transform="translate(0, 100) scale(1, -1)">\n`;
        output += this.renderSolutions();
        output += this.renderObstacles();
        output += `</g></svg>\n\n`;
        return output;
    }

    private renderSolutions(): string {
        let output = '';
        for (const solution of this.solutions) {
            const color = solution.isComplete ? 'green' : 'red';
            let currentNode = solution;
            while (currentNode) {
                if (currentNode.cameFrom) {
                    output += this.renderLine(currentNode.point, currentNode.cameFrom.point, color);
                }
                currentNode = currentNode.cameFrom;
            }
        }
        return output;
    }

    private renderLine(start: Vector2D, end: Vector2D, color = 'black'): string {
        return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" style="stroke:${color}" />\n`;
    }

    private renderObstacles(): string {
        let output = '';
        for (const polygon of this.obstacles) {
            output += this.renderPolygon(polygon);
        }
        return output;
    }

    private renderPolygon(polygon: Polyline, color = 'black'): string {
        const points = polygon.points.map(p => `${p.x},${p.y}`).join(' ');
        return `<polygon points="${points}" stroke="${color}"/>\n`;
    }
}

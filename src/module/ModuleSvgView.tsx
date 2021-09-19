import {Module} from "./Module";
import * as React from "react";

interface ModuleSvgViewProps {
    module: Module;
}

/**
 * TODO to be reused
 */
export class ModuleSvgView extends React.Component<ModuleSvgViewProps> {
    constructor(props: ModuleSvgViewProps) {
        super(props);
    }

    render() {
        const module = this.props.module;
        const pathD = module.getFootprintPolylines().map(polyline => polyline.svgPath()).join(' ');
        const outline = module.outline;
        return (
            <div className="module-svg-container">
                <svg xmlns="http://www.w3.org/2000/svg"
                     viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                     preserveAspectRatio="xMinYMin meet">
                    <g transform={`translate(0, ${outline.mirror}) scale(1, -1)`}>
                        <path className="footprint" d={pathD}/>
                        {module.features.map(f =>
                            <line className={f.type}
                                  key={f.id}
                                  x1={f.points[0].x}
                                  y1={f.points[0].y}
                                  x2={f.points[1].x}
                                  y2={f.points[1].y}/>)
                        }
                    </g>
                </svg>
            </div>
        );
    }
}

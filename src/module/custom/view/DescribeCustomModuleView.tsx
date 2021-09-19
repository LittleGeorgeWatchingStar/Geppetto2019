import {CustomerModuleCreate} from "../CustomerModuleCreate";
import {Module} from "../../Module";
import React = require("react");

interface DescribeCustomModuleProps {
    customerModuleCreate: CustomerModuleCreate;
    onSave: (module: Module) => void;
    onClickBack: () => void;
}

export function DescribeCustomModule(props: DescribeCustomModuleProps) {
    const viewData = props.customerModuleCreate.moduleViewData;
    const outline = viewData.outline;
    const [errors, setErrors] = React.useState([]);

    function getCustomModuleSVG(): JSX.Element {
        return (
            <div className="module-svg-column">
                <svg className="module-svg"
                     xmlns="http://www.w3.org/2000/svg"
                     viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                     preserveAspectRatio="xMinYMin meet">
                    <g className="module-svg-outline">
                        <path className="footprint"
                              d={viewData.polylines.map(polyline => polyline.svgPath()).join(' ')}/>
                        {viewData.features.map((feature, i) => {
                            return (
                                <line key={i}
                                      x1={feature[0].x}
                                      y1={feature[0].y}
                                      x2={feature[1].x}
                                      y2={feature[1].y}/>);
                        })}
                    </g>
                </svg>
                <div className="module-name">
                    <span>{props.customerModuleCreate.templateRevision.name}</span>
                </div>
            </div>
        )
    }

    function onSubmit(): void {
        const errors = props.customerModuleCreate.validate();
        if (errors.length > 0) {
            setErrors(errors);
            return;
        }
        props.customerModuleCreate.create()
            .done(props.onSave)
            .fail(xhr => {
                const errorData = xhr.responseJSON;
                if (errorData && errorData.errors) {
                    setErrors(errorData.errors);
                } else {
                    setErrors(['Unknown server error. Please try again later.']);
                }
            });
    }

    function onInputName(event): void {
        props.customerModuleCreate.name = event.target.value;
    }

    function onInputDescription(event): void {
        props.customerModuleCreate.description = event.target.value;
    }

    return (
        <React.Fragment>
            <div className="tab-header">
                <div>
                    <h3>
                <span className="cta-link back font-bold"
                      data-test="backButton"
                      onClick={props.onClickBack}>Back</span> Step 2: Name and
                        describe your module</h3>
                </div>
            </div>
            <div className="tab-content flex-wrapper">
                <section className="describe">
                    <section>
                        <label>
                            <span className="header required">Name</span>
                            <input type="text"
                                   data-test="customModuleName"
                                   name="name"
                                   maxLength={50}
                                   required
                                   placeholder="Name your module..."
                                   onInput={onInputName}/>
                        </label>
                    </section>

                    <section>
                        <label>
                            <span className="header">Description (optional)</span>
                            <textarea name="description"
                                      data-test="customModuleDescription"
                                      maxLength={500}
                                      rows={5}
                                      defaultValue={props.customerModuleCreate.description}
                                      onInput={onInputDescription}
                            />
                        </label>
                    </section>
                    <section>
                        <p>When submitted, your new module will appear under the 'Custom Modules' category in the
                            library.</p>
                        <ul className="error">
                            {errors.map((error, i) => <li key={i}>{error}</li>)}
                            {props.customerModuleCreate.validate().map((error, i) => <li key={i}>{error}</li>)}
                        </ul>
                        <button type="button"
                                data-test="submitButton"
                                onClick={onSubmit}
                                className="submit cta">Create Module
                        </button>
                    </section>
                </section>
                <section className="preview">
                    <span className="header">Preview</span>
                    <div className="preview-container">
                        <div className="buses">
                            <h4 className="bus-heading">
                                Board Signals ({props.customerModuleCreate.requires.length})
                            </h4>
                            <ul className="input-buses">
                                {props.customerModuleCreate.requires.map(bus =>
                                    <li key={bus.uuid}>{bus.name}</li>)}
                            </ul>
                            <div className="pointer right"/>
                        </div>
                        {getCustomModuleSVG()}
                        <div className="buses">
                            <h4 className="bus-heading">
                                External Signals ({props.customerModuleCreate.provides.length})
                            </h4>
                            <ul className="output-buses">
                                {props.customerModuleCreate.provides.map(bus =>
                                    <li key={bus.uuid}>{bus.name}</li>)}
                            </ul>
                            <div className="pointer left"/>
                        </div>
                    </div>
                </section>
            </div>
        </React.Fragment>
    );
}

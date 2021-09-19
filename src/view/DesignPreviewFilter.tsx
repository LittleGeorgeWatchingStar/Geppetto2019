import * as React from "react";
import {Module} from "../module/Module";
import {ReactNode} from "react";
import {ServerID} from "../model/types";
import {DesignPreviewFilterItem} from "./DesignPreviewFilterItem";

interface DesignPreviewFilterProps {
    modules: Module[];
    selectedModuleIds: Set<ServerID>;
    onClearSelectedModuleIds: () => void;
    onSelectModule: (module) => void;
}

interface DesignPreviewFilterState {
    selectedFilterItems: Module[];
    leftShiftValue: number;
    rightShiftValue: number;
}


/**
 * Renders that widget that allows you to filter designs by the modules
 * they contain. Requires modules to be loaded.
 */
export class DesignPreviewFilter extends React.Component<DesignPreviewFilterProps, DesignPreviewFilterState> {
    private shiftFactorValue = 400;

    constructor(props: DesignPreviewFilterProps) {
        super(props);
        this.state = {
            selectedFilterItems: [],
            leftShiftValue: 0,
            rightShiftValue: 0
        };
    }

    componentDidMount() {
        this.updateSelectModuleList();
    }

    componentDidUpdate(prevProps: Readonly<DesignPreviewFilterProps>, prevState: Readonly<DesignPreviewFilterState>, snapshot?: any) {
        if (document.querySelector('.filter-available-container')) {
            const filterClientWidth = document.querySelector('.filter-available-container').clientWidth;
            const filterScrollWidth = document.querySelector('.filter-available-container').scrollWidth;
            if (filterScrollWidth > filterClientWidth && this.state.rightShiftValue === 0) {
                this.setState({rightShiftValue: Math.abs(filterScrollWidth - filterClientWidth)});
            }
        }
        if (this.props.selectedModuleIds) this.updateSelectModuleList();
    }

    render(): ReactNode {
        return (
            <div className="design-filter">
                {this.state.leftShiftValue !== 0 &&
                <div className="left-shift-arrow"
                     onClick={() => this.shiftLeft()}/>}
                <div className="filter-available-container"
                     style={{transform: `translateX(-${this.state.leftShiftValue}px)`}}>
                    {this.modulesView}
                </div>
                {this.state.rightShiftValue > 0 &&
                <div className="right-shift-arrow"
                     onClick={() => this.shiftRight()}/>}
                {this.props.selectedModuleIds.size > 0 &&
                <div className="filter-selected-container">
                    <button className="clear-button"
                            onClick={() => this.props.onClearSelectedModuleIds()}>
                        Reset All
                    </button>
                    {this.selectedFilterList}
                </div>}
            </div>
        )
    }

    private get modulesView(): JSX.Element[][] {
        const sorted = this.sortedModules as { categoryName: Module[] };
        return Object.keys(sorted).map(categoryName => {
            return [
                <DesignPreviewFilterItem selectedModuleIds={this.props.selectedModuleIds}
                                         onSelectModule={(module) => this.props.onSelectModule(module)}
                                         categoryName={categoryName}
                                         moduleList={sorted[categoryName]}
                                         key={categoryName}/>
            ];
        });
    }

    private get selectedFilterList(): ReactNode {
        if (!this.state.selectedFilterItems) return;
        const selectedList = [];
        this.state.selectedFilterItems.forEach((module, i) => {
            selectedList.push(
                <div className="filter-quick-unselect"
                     onClick={() => this.props.onSelectModule(module)}
                     key={i}>
                    {module.name}
                </div>
            )
        });
        return selectedList;
    }

    private get sortedModules(): { categoryName: Module[] } {
        const categories = {} as { categoryName: Module[] };
        for (const module of this.props.modules) {
            if (!categories[module.categoryName]) {
                categories[module.categoryName] = [];
            }
            categories[module.categoryName].push(module);
        }
        return categories;
    }

    private shiftLeft(): void {
        if (this.state.leftShiftValue !== 0) {
            this.setState({
                leftShiftValue: this.state.leftShiftValue - this.shiftFactorValue,
                rightShiftValue: this.state.rightShiftValue + this.shiftFactorValue
            });
        }
    }

    private shiftRight(): void {
        if (this.state.rightShiftValue > 0) {
            this.setState({
                leftShiftValue: this.state.leftShiftValue + this.shiftFactorValue,
                rightShiftValue: this.state.rightShiftValue - this.shiftFactorValue
            });
        }
    }

    private updateSelectModuleList(): void {
        const newSelectionList = this.props.modules.filter(module => {
            return this.props.selectedModuleIds.has(module.moduleId);
        });
        if (newSelectionList.length != this.state.selectedFilterItems.length) {
            this.setState({selectedFilterItems: newSelectionList});
        }
    }
}
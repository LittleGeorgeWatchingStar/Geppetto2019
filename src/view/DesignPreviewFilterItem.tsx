import * as React from "react";
import {Module} from "../module/Module";
import {ServerID} from "../model/types";

interface DesignPreviewFilterItemProps {
    selectedModuleIds: Set<ServerID>;
    onSelectModule: (module) => void;
    categoryName: string;
    moduleList: Module[];
}

interface DesignPreviewFilterItemState {
    listCollapsed: boolean;
}

export class DesignPreviewFilterItem extends React.Component<DesignPreviewFilterItemProps, DesignPreviewFilterItemState> {
    constructor(props: DesignPreviewFilterItemProps) {
        super(props);
        this.state = {
            listCollapsed: true,
        }
    }

    componentDidUpdate(prevProps: Readonly<DesignPreviewFilterItemProps>, prevState: Readonly<DesignPreviewFilterItemState>, snapshot?: any) {
        if (!this.state.listCollapsed) {
            document.addEventListener('click', (e) => {
                this.setState({listCollapsed: true});
            }, {once: true});
        }
    }

    render() {
        const categorySelected = this.state.listCollapsed ? '' : 'filter-category-selected';

        return (
            <div className="filter-available-item">
                <h4 className={categorySelected}
                    onClick={() => this.listDisplayToggle()}>{this.props.categoryName}</h4>
                {!this.state.listCollapsed &&
                <ul onClick={(e) => this.propagation(e)}>
                    {this.props.moduleList.map(module => {
                        return <li className={this.isSelected(module) ? 'selected-js' : ''}
                                   onClick={() => this.props.onSelectModule(module)}
                                   title={this.getModuleName(module)}
                                   key={module.getRevisionId()}>
                            <span>
                                {this.getMarketingIcon(module)}
                                {this.getModuleName(module)}
                            </span>
                        </li>;
                    })}
                </ul>}
            </div>
        );
    }

    private getModuleName(module: Module): string {
        return `${module.name} ${this.getRestrictionTags(module)}`;
    }

    private getRestrictionTags(module: Module): string {
        const tags = [];
        if (module.isDev() && !module.isStable()) {
            tags.push('DEV');
        }
        if (module.isRestricted()) {
            tags.push('MUGR');
        }
        return tags.map(t => `(${t})`).join(' ');
    }

    private getMarketingIcon(module: Module): JSX.Element | null {
        const icon = module.icon;
        return icon ? <img src={icon} className={"icon"}/> : null;
    }

    private isSelected(module: Module): boolean {
        return this.props.selectedModuleIds.has(module.moduleId);
    }

    private listDisplayToggle(): void {
        this.setState({listCollapsed: !this.state.listCollapsed});
    }

    private propagation(e): void {
        e.nativeEvent.stopImmediatePropagation();
    }
}
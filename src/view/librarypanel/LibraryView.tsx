import * as $ from "jquery";
import {Module} from "../../module/Module";
import {LOGOS_AND_PRINTS} from "../../module/Category";
import {Workspace} from "../../workspace/Workspace";
import * as React from "react";
import {categorizeModules, compareModuleLists} from "../../module/helpers";


export interface LibraryViewProps {
    modules: Module[];
    visible: boolean;
    workspace: Workspace;
    makeModuleTile: (m: Module) => JSX.Element;
}


/**
 * Container for module tiles filtered by:
 * 1) a RequireBus, where the modules shown can provide for it;
 * 2) members of a given module's functional group.
 *
 * These modes are mutually exclusive.
 */
export class FilteredLibraryView extends React.Component<LibraryViewProps> {

    private readonly panel;

    constructor(props: LibraryViewProps) {
        super(props);
        this.panel = React.createRef();
    }

    render(): JSX.Element {
        const categorizedModules = categorizeModules(this.props.modules);
        const categoryNames = Object.keys(categorizedModules);
        return (
            <div className="filtered-library"
                     style={{display: this.props.visible ? '' : 'none'}}
                     ref={this.panel}>
                {categoryNames.map(c =>
                    <div key={c}>
                        {getCategoryHeader(c)}
                        <div className="panel-category">
                            {categorizedModules[c].map(m => this.props.makeModuleTile(m))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    shouldComponentUpdate(nextProps: Readonly<SearchLibraryViewProps>): boolean {
        if (nextProps.visible !== this.props.visible) {
            return true;
        }
        return compareModuleLists(nextProps.modules, this.props.modules);
    }
}


interface SearchLibraryViewProps extends LibraryViewProps {
    showLogo: boolean;
    makeLogoTile: () => JSX.Element;
}

export class SearchLibraryView extends React.Component<SearchLibraryViewProps> {

    constructor(props: SearchLibraryViewProps) {
        super(props);
    }

    render(): JSX.Element {
        const categorizedModules = categorizeModules(this.props.modules);
        const categoryNames = Object.keys(categorizedModules);
        return (
            <div className="search-library"
                 style={{display: this.props.visible ? '' : 'none'}}>
                {categoryNames.map(c =>
                    <div key={c}>
                        {getCategoryHeader(c)}
                        <div className="panel-category">
                            {categorizedModules[c].map(m => this.props.makeModuleTile(m))}
                        </div>
                    </div>
                )}
                {this.props.showLogo && this.logoCategory}
            </div>
        )
    }

    shouldComponentUpdate(nextProps: Readonly<SearchLibraryViewProps>): boolean {
        if (nextProps.visible !== this.props.visible) {
            return true;
        }
        return compareModuleLists(nextProps.modules, this.props.modules);
    }

    private get logoCategory(): JSX.Element {
        return <div>
            {getCategoryHeader(LOGOS_AND_PRINTS)}
            <div className="panel-category">
                {this.props.makeLogoTile()}
            </div>
        </div>
    }
}

function getCategoryHeader(categoryName: string): JSX.Element {
    return (
        <h3 className="category-header">
            <span className={`${categoryName.toLowerCase()} label`}>
                {categoryName}
            </span>
        </h3>
    );
}

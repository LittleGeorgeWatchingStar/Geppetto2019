import * as React from "react";
import {Module} from "../../module/Module";
import {Library} from "../../module/Library";
import markdown from "utils/markdown";
import UserController from "../../auth/UserController";
import {ThemeController} from "../../controller/ThemeController";
import {ReactNode} from "react";

interface LatestModulesProps {
    library: Library;
    libraryLoading: boolean;
}

const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec"
];


interface LatestModulesState {
    sortedModules: { categoryName: Module[] },
}

/**
 * A view showing some of the most recently created modules.
 */
export class LatestModules extends React.Component<LatestModulesProps, LatestModulesState> {

    private static NUM_RESULTS = 25;

    private sortedModules: { categoryName: Module[] };

    /**
     * When each category was most recently updated.
     */
    private categoryDates: { categoryName: string };


    constructor(props: LatestModulesProps) {
        super(props);
        this.state = {
            sortedModules: this.getSortModules()
        };
    }

    componentWillReceiveProps(nextProps: Readonly<LatestModulesProps>, nextContext: any) {
        if (nextProps.library) this.setState({sortedModules: this.getSortModules()});
    }

    render(): ReactNode {
        return (
            <div>
                <div className="tabview-header">
                    <div className="masthead">
                        <div className="tab-title">
                            Latest Modules
                        </div>
                    </div>
                </div>
                <div className="tabview-body">
                    <div className={`shutter shutter-${ThemeController.getInstance().THEME} tab-shutter`}/>
                    <div className="latest-modules">
                        {this.props.libraryLoading &&
                            // TODO: Make loader look better.
                            <span>Loading...</span>}
                        {!this.props.libraryLoading && Object.keys(this.state.sortedModules).map(category => {
                            return <div className="module-category"
                                        key={category}>
                                <div className="module-category-header-container">
                                    <h2 className="module-category-header">{category}</h2>
                                    <div className="module-category-date">
                                        Updated {this.categoryDates[category]}
                                    </div>
                                </div>
                                <div className="latest-modules__module-list">
                                    {this.sortedModules[category].map(module => this.getModuleView(module))}
                                </div>
                            </div>
                        })}
                    </div>
                </div>
            </div>)
    }

    private getSortModules(): { categoryName: Module[] } {
        const modules = this.filteredModules;
        modules.sort((a, b) => b.compareLaunch(a));
        this.sortedModules = {} as { categoryName: Module[] };
        this.categoryDates = {} as { categoryName: string };
        for (const module of modules.slice(0, LatestModules.NUM_RESULTS)) {
            if (!this.sortedModules[module.categoryName]) {
                this.sortedModules[module.categoryName] = [];
                this.categoryDates[module.categoryName] = this.getDateString(module);
            }
            this.sortedModules[module.categoryName].push(module);
        }
        return this.sortedModules;
    }

    private get filteredModules(): Module[] {
        return this.props.library.filter(m =>
            m.isVisibleToUser(UserController.getUser())
            && m.isStable()
            && !m.isCustomerModule()
        );
    }

    private getDateString(module: Module): string {
        const date = new Date(module.launch);
        return `${month[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    private getModuleView(module: Module): JSX.Element {
        return <div className="module-list-item"
                    key={module.id}>
            <div className="module-list-item-content">
                {this.getModuleImage(module) &&
                <div className="module-list-item-thumbnail"
                     dangerouslySetInnerHTML={{__html: this.getModuleImage(module)}}/>}
                <div className="module-list-item-info">
                    <h3>{module.name}</h3>
                    {this.getDescription(module)}
                </div>
            </div>
        </div>
    }

    private getDescription(module: Module): JSX.Element {
        const description = markdown(module.description);
        return <div className="module-list-item-description"
                    dangerouslySetInnerHTML={{__html: description}}/>
    }

    /**
     * Module images are combined with their description in the data.
     * Since data migrations are pita bread, this extracts the image from the description.
     */
    private getModuleImage(module: Module): string | null {
        const $description = $(markdown(module.description));
        const $image = $description.find('img');
        return $image.length > 0 ? $image[0].outerHTML : null;
    }
}

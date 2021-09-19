import * as React from "react";
import {Module} from "../../module/Module";
import {LOGOS_AND_PRINTS} from "../../module/Category";
import * as $ from "jquery";
import "lib/jquery-ui";
import {LibraryViewProps} from "./LibraryView";
import * as Config from "Config";
import markdown from "../../utils/markdown";
import {compareModuleLists} from "../../module/helpers";
import UserController from "../../auth/UserController";
import {FeatureFlag} from "../../auth/FeatureFlag";


interface DefaultLibraryProps extends LibraryViewProps {
    traverse: (nav: string) => void;
    back: () => void;
    navigation: string[];
    makeLogoTile: () => JSX.Element;
}

/**
 * The default library view shows:
 * 1) Category shelves that can be opened by clicking on them.
 * 2) A container for displaying the module tiles of a category shelf.
 *      2a. If a category contains members of a functional group, it will display functional group shelves.
 */
export class DefaultLibraryView extends React.Component<DefaultLibraryProps> {

    /**
     * Organizes modules by their functional group. (Only for modules that have a functional group.)
     */
    private functionalGroups: { [functionalGroup: string]: Module[] };

    private categorizedModules: { [moduleCategory: string]: Module[] };

    private readonly moduleContainer;

    constructor(props: DefaultLibraryProps) {
        super(props);
        this.functionalGroups = {};
        this.categorizedModules = {};
        this.moduleContainer = React.createRef();
    }

    public render() {
        return (
            <div className="default-library"
                 style={{display: this.props.visible ? '' : 'none'}}>
                {this.categoryShelves}
                <div className="category-modules" ref={this.moduleContainer}>
                    {this.currentHeader}
                    {this.currentPanel}
                    {this.loader}
                </div>
            </div>
        )
    }

    private get categoryShelves(): JSX.Element {
        const shelfHeaders = Object.keys(this.categorizedModules).map(c => this.getDefaultHeading(c));
        const newPlaygroundUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_PLAYGROUND_UI);

        return <div className={`category-shelves ${newPlaygroundUI ? 'category-shelves-new-ui': ''}`}>
            {shelfHeaders}
            {this.getDefaultHeading(LOGOS_AND_PRINTS)}
        </div>
    }

    private get isValidTraverse(): boolean {
        const category = this.currentCategoryName;
        return undefined != this.categorizedModules[category] ||
            undefined != this.functionalGroups[category] ||
            category === LOGOS_AND_PRINTS;
    }

    private get currentCategoryName(): string | null {
        const nav = this.props.navigation;
        return nav.length > 0 ? nav[nav.length - 1] : null;
    }

    private get loader(): JSX.Element | undefined {
        if (this.props.modules.length === 0) {
            return <div className="panel-loader-container">
                <div className="panel-loader">
                    <img src={`${Config.STATIC_URL}/image/geppetto-shutter.png`}
                         alt="Geppetto Logo"
                         className="blink"/>
                    <span>Loading modules...</span>
                </div>
            </div>
        }
    }

    private get currentHeader(): JSX.Element | undefined {
        if (!this.isValidTraverse) return;
        return <h3 className="category-header"
                   onClick={() => this.props.back()}>{this.currentCategoryName}</h3>
    }

    private get currentPanel(): JSX.Element | undefined {
        if (this.currentCategoryName === LOGOS_AND_PRINTS) {
            return (<div className="panel-category">
                {this.props.makeLogoTile()}
            </div>);
        }
        if (!this.isValidTraverse) return;
        return (<div className="panel-category">
            {this.functionalGroupShelves}
            {this.currentModules}
        </div>);
    }

    /**
     * TODO this can possibly cause category/functional group name collisions
     */
    private get currentModules(): JSX.Element[] {
        const category = this.currentCategoryName;
        if (this.categorizedModules[category]) {
            return this.categorizedModules[category].map(m =>
                m.functionalGroup ? null : this.props.makeModuleTile(m)
            );
        }
        if (this.functionalGroups[category]) {
            return this.functionalGroups[category].map(m => this.props.makeModuleTile(m));
        }
        return [];
    }

    /**
     * TODO this function makes some gross assumptions for the sliding animation:
     * If we have moved from level 0 (module shelves) to level 1 (module categories), slide in the module container.
     * If vice versa, slide out the container.
     * Else, don't play the animation.
     */
    public componentDidUpdate(prevProps: Readonly<DefaultLibraryProps>): void {
        // Handle navigation failure
        if (this.props.navigation.length > 1 && !this.isValidTraverse) {
            this.props.traverse(null);
            return;
        }
        if (this.props.navigation.length === 0 && prevProps.navigation.length > 0) {
            this.slideOutModuleContainer();
            return;
        }
        if (this.props.navigation.length === 1 && prevProps.navigation.length === 0) {
            this.slideInModuleContainer();
        }
    }

    public shouldComponentUpdate(nextProps: Readonly<DefaultLibraryProps>): boolean {
        if (compareModuleLists(nextProps.modules, this.props.modules)) {
            this.sortDefaultModules(nextProps.modules);
            return true;
        }
        if (nextProps.navigation.length !== this.props.navigation.length) {
            return true;
        }
        return nextProps.visible !== this.props.visible;
    }

    private get functionalGroupShelves(): JSX.Element | null {
        const current = this.currentCategoryName;
        if (!current || !this.categorizedModules[current] ||
            current.includes(LOGOS_AND_PRINTS)) return null;
        const checked = {};
        const shelves = [];
        for (const module of this.categorizedModules[current]) {
            const group = module.functionalGroupName;
            if (!checked[group]) {
                checked[group] = true;
                shelves.push(this.getFunctionalGroupShelf(group));
            }
        }
        return <div className="functional-groups">{shelves}</div>;
    }

    private getFunctionalGroupShelf(group: string): JSX.Element | undefined {
        const members = this.functionalGroups[group];
        if (!members) return;
        return (
            <div className="functional-group"
                 onClick={() => this.props.traverse(group)}
                 key={group}>
                <div className="icon">{this.getIcon(members)}</div>
                <div>
                    <div className="title">{group} ({members.length})</div>
                    <div className="price">{this.getPriceRange(members)}</div>
                </div>
            </div>
        );
    }

    private getIcon(modules: Module[]): JSX.Element | null {
        let backup = null;
        for (const m of modules) {
            for (const feature of m.getMarketing()) {
                if (feature.image_uri) {
                    return(<img className="design-feature"
                                    src={feature.image_uri}
                                    alt={feature.description}
                                    key={feature.value}
                    />);
                }
            }
            if (!backup) {
                const $image = $(markdown(m.description)).find('img');
                if ($image.length > 0) {
                    backup = <div className="module-image-container"
                                dangerouslySetInnerHTML={{__html: $image[0].outerHTML}}/>
                }
            }
        }
        return backup;
    }

    private getPriceRange(modules: Module[]): string {
        let lowest = Infinity;
        let highest = 0;
        for (const module of modules) {
            if (module.getPrice() < lowest) {
                lowest = module.getPrice();
            }
            if (module.getPrice() > highest) {
                highest = module.getPrice();
            }
        }
        return `$${lowest.toFixed(2)} - ${highest.toFixed(2)}`;
    }

    private sortDefaultModules(modules: Module[]): void {
        this.categorizedModules = {};
        this.functionalGroups = {};
        for (const module of modules) {
            if (!this.categorizedModules[module.categoryName]) {
                this.categorizedModules[module.categoryName] = [];
            }
            if (module.functionalGroup) {
                const group = module.functionalGroupName;
                if (!this.functionalGroups[group]) {
                    this.functionalGroups[group] = [];
                }
                this.functionalGroups[group].push(module);
            }
            this.categorizedModules[module.categoryName].push(module);
        }
    }

    /**
     * A clickable heading for the category shelves in the default library.
     */
    private getDefaultHeading(category: string): JSX.Element {
        const onClick = () => this.props.traverse(category);
        return (
            <h3 className="default-header"
                onClick={onClick}
                key={category}>
                <span className={`${category.toLowerCase()} label`}>
                    {category}
                </span>
            </h3>
        );
    }

    /**
     * A category opens by appearing to slide in from the edge of the window.
     */
    private slideInModuleContainer(): void {
        const $container = $(this.moduleContainer.current);
        $container.removeClass('slide-out-js');
        $container.addClass('slide-in-js');
    }

    /**
     * Return to the category shelves by sliding out the module container.
     */
    private slideOutModuleContainer(): void {
        const $container = $(this.moduleContainer.current);
        $container.removeClass('slide-in-js');
        $container.addClass('slide-out-js');
    }
}

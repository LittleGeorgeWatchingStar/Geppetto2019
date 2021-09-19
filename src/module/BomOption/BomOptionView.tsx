import {SubMenu} from "../../view/SubMenu";
import {BomChoice, BomOption} from "./BomOption";
import * as React from "react";
import * as ReactDOM from 'react-dom';
import * as Backbone from "backbone";
import {ChangeBom} from "./actions";
import {executeAction} from "../../core/action";
import {ACTION_REVERSED} from "../../placedmodule/events";
import events from "../../utils/events";

/**
 * The submenu for a single BOM option.
 * TODO remove inheritance
 */
export default class BomOptionView extends SubMenu {
    public model: BomOption;

    get className(): string {
        return 'bom-options always-green';
    }

    protected createMenu(): void {
        super.createMenu();
        this.render();
    }

    initialize(): this {
        super.initialize();
        // TODO if BOM select has been undone:
        this.listenTo(events, ACTION_REVERSED, () => this.renderOptions());
        return this;
    }

    render(): this {
        this.$el.empty().append(
            `<div class="submenu-option">
                ${this.model.description}
                <ol class="bus sub-options">
                </ol>
            </div>`);
        this.renderOptions();
        return this;
    }

    private renderOptions() {
        const $container = this.$('.sub-options');
        ReactDOM.unmountComponentAtNode($container[0]);
        $container.empty();
        this.model.choices.forEach(c => $container.append(this.bomChoiceView(c)));
    }

    private bomChoiceView(c: BomChoice): JQuery {
        const onSelect = () => {
            if (this.model.selected !== c) {
                ChangeBom.userSelect(this.model, c);
                this.renderOptions();
            }
        };
        return new BomChoiceView(c, onSelect).$el;
    }

    protected get submenuItemContent(): string {
        return this.model.description;
    }
}


/**
 * TODO JQuery events on the parent views interfere with React events.
 * This Backbone extension is just for the event callback.
 */
class BomChoiceView extends Backbone.View<any> {
    constructor(private readonly bomChoice: BomChoice,
                private readonly onSelect: () => void) {
        super();
        this.render();
    }

    render() {
        const c = this.bomChoice;
        ReactDOM.render(
            <li className={`choice ${c.isSelected ? 'selected' : ''}`}>
                <a className="bom-option">
                    {c.description}
                </a>
            </li>,
            this.$el[0]
        );
        return this;
    }

    events() {
        return {
            click: () => this.onSelect()
        };
    }
}
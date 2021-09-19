import {Dialog} from "../view/Dialog";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {PartnerTheme, ThemeController} from "../controller/ThemeController";
import events from "../utils/events";
import {DASHBOARD_ACTION} from "../view/events";
import {USER_SELECTED_PARTNER_THEME} from "./events";

let themeDialog = null;

export function openThemeControlDialog(): void {
    createThemeControlDialog();
    ReactDOM.render(<ThemeControl/>, themeDialog.el);
}

function createThemeControlDialog(): Dialog {
    if (themeDialog) {
        themeDialog.close();
    }
    const width = Math.min(600, $(window).width() * 0.5);
    themeDialog = new Dialog({
        title: 'Theme Control',
        width: width,
        height: $(window).height() * 0.3
    });
    themeDialog.$el.addClass('partner-theme-control-dialog');
    return themeDialog;
}

interface ThemeControlProps {

}

interface ThemeControlState {
    selectedTheme: string;
}

export class ThemeControl extends React.Component<ThemeControlProps, ThemeControlState> {
    constructor(props: ThemeControlProps) {
        super(props);
        this.state = {selectedTheme: ThemeController.getInstance().THEME};
    }

    render() {
        return (
            <div className='partner-theme-control-content'>
                <h3>Partner Theme Control</h3>
                <ul className="theme-list">
                    {ThemeController.getInstance().getAvailableThemes().map(theme => this.themeListItem(theme))}
                </ul>
                <button onClick={() => this.resetDefault()}>Reset Default</button>
            </div>
        );
    }

    private themeListItem(theme: string): JSX.Element {
        return (
            <li key={theme}>
                <div className="theme-item"
                     onClick={() => this.toggleTheme(theme)}>
                    <span className={this.state.selectedTheme === theme ? 'enabled-icon' : 'disabled-icon'}/>
                    {theme.toUpperCase()} THEME
                </div>
            </li>
        )
    }

    private toggleTheme(theme: string): void {
        ThemeController.getInstance().applyTheme(theme);
        events.publish(DASHBOARD_ACTION); //refresh dashboard icon
        events.publish(USER_SELECTED_PARTNER_THEME); //refresh workspace toolbar icon
        this.setState({selectedTheme: theme});
    }

    private resetDefault(): void {
        ThemeController.getInstance().resetDefault();
        events.publish(DASHBOARD_ACTION); //refresh dashboard icon
        events.publish(USER_SELECTED_PARTNER_THEME); //refresh workspace toolbar icon
        this.setState({selectedTheme: ThemeController.getInstance().THEME});
    }
}
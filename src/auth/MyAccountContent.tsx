import * as React from "react";
import UserController from "./UserController";
import {LoginController} from "../controller/Login";
import {DropDownMenu} from "../view/tabdropdown/DropDownMenu";
import {DropDownMenuItems} from "../view/tabdropdown/DropDownMenuItems";

interface MyAccountContentProps {
    isDropdownOpen: boolean;
    isUserLoggedIn?: boolean;
}

interface MyAccountContentState {
    isDropdownOpen: boolean;
    isUserLoggedIn: boolean;
}

export class MyAccountContent extends React.Component<MyAccountContentProps, MyAccountContentState> {
    constructor(props: MyAccountContentProps) {
        super(props);

        this.state = {
            isDropdownOpen: false,
            isUserLoggedIn: UserController.getUser().isLoggedIn(),
        }
    }

    componentWillReceiveProps(nextProps: Readonly<MyAccountContentProps>, nextContext: any) {
        this.setState({isDropdownOpen: nextProps.isDropdownOpen});
        if (nextProps.isUserLoggedIn) {
            this.setState({isUserLoggedIn: nextProps.isUserLoggedIn});
        }
    }

    render(): JSX.Element {
        const user = UserController.getUser();
        const dropDownShowClass = this.state.isDropdownOpen ? "my-account-button-dropdown-open" : "";

        return (
            <div id="my-account-content">
                {!user.isLoggedIn() &&
                <button className="my-account-login"
                        onClick={() => LoginController.getInstance().login()}
                >Login</button>
                }
                {user.isLoggedIn() &&
                <button className={"my-account-button " + dropDownShowClass}
                        onClick={() => this.setState({isDropdownOpen: !this.state.isDropdownOpen})}
                >My Account</button>
                }

                <DropDownMenu menuItemGroups={DropDownMenuItems()} isVisible={this.state.isDropdownOpen}/>
            </div>
        );
    }
}
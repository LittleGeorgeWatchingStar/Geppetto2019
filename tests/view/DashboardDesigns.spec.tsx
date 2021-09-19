import User from "../../src/auth/User";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {UserContext} from "../../src/auth/UserContext";
import {DashboardDesigns} from "../../src/view/dashboard/DashboardDesigns";
import {Library} from "../../src/module/Library";

describe('DashboardDesigns', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    afterEach(() => {
        ReactDOM.unmountComponentAtNode(container);
        document.clear();
    });

    describe('Welcome message', () => {
        it("contains the user's first name if defined", () => {
            const user = new User({
                first_name: "Pejoy"
            });
            ReactDOM.render(
                <UserContext.Provider value={user}>
                    <DashboardDesigns url={''}
                                      library={new Library()}
                                      libraryLoading={false}
                                      userDesigns={[]}
                                      sharedDesigns={[]}
                                      cloneableDesigns={[]}
                                      partnerDesigns={[]}
                                      designsLoading={true}
                                      menuTabSelection={()=>{}}/>
                </UserContext.Provider>, container);
            expect(container.querySelectorAll('h2')[0].innerHTML)
                .toContain('Pejoy');
        });
        it("is a generic message if the user has no name", () => {
            ReactDOM.render(
                <UserContext.Provider value={new User()}>
                    <DashboardDesigns url={''}
                                      library={new Library()}
                                      libraryLoading={false}
                                      userDesigns={[]}
                                      sharedDesigns={[]}
                                      cloneableDesigns={[]}
                                      partnerDesigns={[]}
                                      designsLoading={true}
                                      menuTabSelection={()=>{}}/>
                </UserContext.Provider>, container);
            expect(container.querySelectorAll('h2')[0].innerHTML)
                .toContain('Welcome to Geppetto');
        });
    });
});
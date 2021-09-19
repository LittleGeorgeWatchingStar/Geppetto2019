import {model} from "../model";
import User from "./User";
import {Chat} from "../chat/chat";


function isLoggedIn(): boolean {
    return model.user.isLoggedIn();
}

function login(event) {
    setGlobalUser(new User(event.auth));
}

function clearGlobalUser() {
    delete model.user;
    setGlobalUser(new User());
}

function setGlobalUser(user) {
    model.user = user;
    Chat.getInstance().setUserData(user);
}

export default {
    isLoggedIn: isLoggedIn,
    setGlobalUser: setGlobalUser,
    clearGlobalUser: clearGlobalUser,
    login: login,
}

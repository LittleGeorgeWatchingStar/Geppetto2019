import * as React from "react";
import User from "./User";

export const UserContext = React.createContext<User>(new User());
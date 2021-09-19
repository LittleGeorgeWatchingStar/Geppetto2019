import {ServerConfig} from "./server-config";
import * as Config from "Config";

let serverConfig: ServerConfig | null;

export class ServerConfigController {
    static init(): Promise<ServerConfig> {
        return new Promise<ServerConfig>((resolve, reject) => {
            fetch('/api/v3/config/')
                .then(response => {
                    if (response.ok) {
                        response.json()
                            .then((newServerConfig: ServerConfig) => {
                                serverConfig = newServerConfig;
                                resolve(serverConfig);
                            })
                            .catch(() => {
                                reject();
                            });
                    } else if (response.status === 401) {
                        /**
                         * NOTE: When an account is created, but has yet to be
                         *  confirmed by email (user is not active), Geppetto server
                         *  will return 401's if the user is logged in to SSO.
                         *  Bring the user to the SSO page, so they can resolve
                         *  this.
                         */
                        window.top.location.href = Config.AUTH_URL;
                    } else if (401 < response.status  && response.status < 500) {
                        /**
                         * NOTE: This will create an infinite loop if being logged in
                         *  was not the problem.
                         */
                        window.top.location.href = `${Config.AUTH_URL}/logout/?next=${Config.API_URL}`;
                    } else {
                        reject();
                    }
                })
                .catch(() => {
                    reject();
                });
        });
    }
}
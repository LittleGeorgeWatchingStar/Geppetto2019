import * as Config from "Config";
import Auth from "../auth/Auth";
import {getClient, HttpClient} from "./HttpClient";
import errorHandler from "../controller/ErrorHandler";

/**
 * Base class for sending data to and from the server.
 */
export abstract class ServerGateway {
    private http: HttpClient = getClient();

    protected get(urlPath: string, params?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.get(url, params);
        return this.withErrorHandling(xhr);
    }

    protected getWithoutErrorHandling(urlPath: string, params?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.get(url, params);
        return this.withAuthHandling(xhr);
    }

    protected put(urlPath: string, data?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.put(url, data);
        return this.withErrorHandling(xhr);
    }

    protected delete(urlPath: string, data?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.delete(url, data);
        return this.withErrorHandling(xhr);
    }

    protected post(urlPath: string, data?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.post(url, data);
        return this.withErrorHandling(xhr);
    }

    protected postWithoutErrorHandling(urlPath: string, data?: any): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.post(url, data);
        return this.withAuthHandling(xhr);
    }

    protected patch(urlPath: string, data?): JQuery.jqXHR {
        const url = this.makeUrl(urlPath);
        const xhr = this.http.patch(url, data);
        return this.withErrorHandling(xhr);
    }

    private makeUrl(urlPath: string): string {
        urlPath = urlPath.replace(/^\/*/, '/');
        const base = Config.API_URL.replace(/\/+$/, '');
        return base + urlPath;
    }

    protected withAuthHandling(xhr: JQuery.jqXHR): JQuery.jqXHR {
        const def = $.Deferred();
        xhr.done((data, textStatus, jqXHR) => {
            if (this.sessionHasExpired(jqXHR)) {
                errorHandler.createAuthRequiredDialog();
                def.reject(jqXHR);
            } else {
                def.resolve(data, textStatus, jqXHR);
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
            if (this.sessionHasExpired(jqXHR)) {
                errorHandler.createAuthRequiredDialog();
            }
            def.reject(jqXHR, textStatus, errorThrown);
        });
        return def.promise() as JQuery.jqXHR;
    }

    /**
     * Handles auth and errors
     */
    private withErrorHandling(xhr: JQuery.jqXHR): JQuery.jqXHR {
        const def = $.Deferred();
        xhr.done((data, textStatus, jqXHR) => {
            this.doneHandler(def, data, textStatus, jqXHR);
        }).fail((jqXHR, textStatus, errorThrown) => {
            this.failHandler(def, jqXHR, textStatus, errorThrown);
        });
        return def.promise() as JQuery.jqXHR;
    }

    protected doneHandler(def: JQuery.Deferred<any>,
                          data,
                          textStatus: string,
                          jqXHR: JQuery.jqXHR): void {
        if (this.sessionHasExpired(jqXHR)) {
            errorHandler.createAuthRequiredDialog();
            def.reject(jqXHR);
        } else {
            def.resolve(data, textStatus, jqXHR);
        }
    }

    private sessionHasExpired(jqXHR: JQuery.jqXHR): boolean {
        const isAuthenticated = Boolean(jqXHR.getResponseHeader('is-authenticated'));
        return Auth.isLoggedIn() && !isAuthenticated;
    }

    protected failHandler(def: JQuery.Deferred<any>,
                        jqXHR: JQuery.jqXHR,
                        textStatus: string,
                        errorThrown): void {
        if (this.sessionHasExpired(jqXHR)) {
            errorHandler.createAuthRequiredDialog();
        } else {
            errorHandler.onFail(jqXHR);
        }
        def.reject(jqXHR, textStatus, errorThrown);
    }
}

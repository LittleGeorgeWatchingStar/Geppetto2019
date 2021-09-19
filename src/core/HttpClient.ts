import * as $ from 'jquery';
import {fakeXhr} from "../../tests/fakes";

export interface HttpClient {
    get(url: string, params?: any): JQuery.jqXHR;
    put(url: string, data): JQuery.jqXHR;
    delete(url: string, data): JQuery.jqXHR;
    post(url: string, data): JQuery.jqXHR;
    patch(url: string, data): JQuery.jqXHR;
}

export function getClient(format = 'json'): HttpClient {
    return new JQueryHttpClient(format);
}

/**
 * Low-level class for making XHR calls to the server.
 *
 * Gateways should use this.
 */
class JQueryHttpClient implements HttpClient {
    constructor(private format = 'json',
                private contentType = 'application/json; charset=utf-8') {
    }

    public get(url: string, params?: any): JQuery.jqXHR {
        return this.xhr({
            url: url,
            method: 'GET',
            data: params,
            xhrFields: {
                withCredentials: true
            }
        });
    }

    public put(url: string, data?: any): JQuery.jqXHR {
        return this.xhr({
            url: url,
            method: 'PUT',
            data: JSON.stringify(data),
            contentType: this.contentType,
            xhrFields: {
                withCredentials: true
            }
        });
    }

    public delete(url: string, data?: any): JQuery.jqXHR {
        return this.xhr({
            url: url,
            method: 'DELETE',
            data: JSON.stringify(data),
            contentType: this.contentType,
            xhrFields: {
                withCredentials: true
            }
        });
    }

    public post(url: string, data?: any): JQuery.jqXHR {
        return this.xhr({
            url: url,
            method: 'POST',
            data: JSON.stringify(data),
            contentType: this.contentType,
            xhrFields: {
                withCredentials: true
            }
        });
    }

    public patch(url: string, data?: any): JQuery.jqXHR {
        return this.xhr({
            url: url,
            method: 'PATCH',
            data: JSON.stringify(data),
            contentType: this.contentType,
            xhrFields: {
                withCredentials: true
            }
        });
    }

    private xhr(options: JQuery.AjaxSettings): JQuery.jqXHR {
        options.dataType = this.format;
        return $.ajax(options);
    }
}

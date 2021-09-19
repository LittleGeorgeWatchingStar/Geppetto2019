import * as $ from 'jquery';
import * as Uri from 'jsuri';
import * as Config from 'Config';

/**
 * Build a URI object from the resource being requested.
 * If that URI doesn't have a host (eg. gumstix.com), a new URI will
 * be built from that global `api_url` and `api_path` variables.
 *
 * @param resource: the absolute or relative URL being requested.
 */
function buildURI(resource: string): Uri {
    const uri = new Uri(resource);
    const api_uri = new Uri(Config.API_URL);

    // TODO: Remove hack. Makes HATEOAS resource urls refer to a port
    // that we can communicate with.
    if (uri.port() !== api_uri.port()) {
        uri.port(api_uri.port());
    }

    if (uri.host()) {
        return uri;
    } else {
        return new Uri(Config.API_URL).setPath(resource);
    }
}

function JsonFromUri(method: string, resource: string, data, contentType, delay?) {
    const uri = buildURI(resource);
    const headers = delay ? {'geppetto-delay': delay} : {};

    return $.ajax({
        type: method,
        url: uri,
        data: data,
        contentType: contentType,
        dataType: 'json',
        headers: headers
    });
}

function update(api_resource: string, data, delay?) {
    return JsonFromUri('put', api_resource, JSON.stringify(data), 'application/json', delay);
}

export default {
    update: update
}

import {ServerGateway} from "../core/ServerGateway";

export interface BoardGateway {
    getUnitPrice(): JQuery.jqXHR<number>;
}

class DefaultGateway extends ServerGateway implements BoardGateway {
    public getUnitPrice(): JQuery.jqXHR<number> {
        return this.get('/api/v3/board/unit-price/');
    }
}

export function getBoardGateway(): BoardGateway {
    return new DefaultGateway();
}
import {getBoardGateway} from "./BoardGateway";
import {Board} from "../model/Board";

/**
 * Loads Board unit price from the server and sets it to the {@see Board} class.
 */
function loadUnitPrice() {
    getBoardGateway().getUnitPrice().then(unitPrice => {
        Board.PRICE = unitPrice;
    });
}

export default {
    loadUnitPrice: loadUnitPrice,
}
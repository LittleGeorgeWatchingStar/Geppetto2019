import {ServerID} from "../model/types";


/**
 * What a placed logo looks like when exported by the server.
 */
export interface PlacedLogoResource  {
    id?: ServerID;
    uuid: string;
    svg_data: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

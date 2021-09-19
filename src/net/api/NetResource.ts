import {ServerID} from "../../model/types";

/**
 * TODO NetResource can be more like this when queried from the server,
 * but some fields are not really relevant to GWeb.
 *  {
          "id": 40679,
          "signal": "SIGNAL_2",
          "signal_id": 2447,
          "value": "",
          "bus_template_id": 799,
          "bus_template_name": "BUS",
          "name": "SIGNAL_2",
          "net_template_id": 2447,
          "net_template_name": "SIGNAL_2"
        }
 */
export interface NetResource {
    id: ServerID
    signal: string;
    value: string;
}

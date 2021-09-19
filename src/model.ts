import {DesignRevision} from "./design/DesignRevision";
import User from "./auth/User";

/**
 * @deprecated
 */
export class GlobalModel {
    design_revision: DesignRevision;
    user: User;
}

/**
 * @deprecated
 */
export const model = new GlobalModel();

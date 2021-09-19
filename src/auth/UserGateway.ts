import {ServerGateway} from "../core/ServerGateway";
import User from "./User";
import errorHandler from "../controller/ErrorHandler";
import {FeatureFlag} from "./FeatureFlag";

const SET_FEATURE_FLAG = '/api/v3/auth/current-user/set-feature-flag/';
const UNSET_FEATURE_FLAG = '/api/v3/auth/current-user/unset-feature-flag/';

export class UserGateway extends ServerGateway {
    public sync(user: User): JQueryXHR {
        return this.put('/api/v3/auth/current-user/sync/')
            .done(data => {
                user.updateProfile(data);
            })
            .fail(errorHandler.onFail);
    }

    public toggleFlag(user: User, flag: FeatureFlag): JQueryXHR {
        const url = user.isFeatureEnabled(flag)
            ? UNSET_FEATURE_FLAG : SET_FEATURE_FLAG;
        return this.post(url,
            {
                featureFlag: flag,
            })
            .done(data => {
                user.updateFlags(data);
            })
            .fail(errorHandler.onFail);
    }
}

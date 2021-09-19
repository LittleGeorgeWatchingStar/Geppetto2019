import User from "../auth/User";
import {EngineeringToolFlag} from "../auth/FeatureFlag";

export class Chat {
    private static instance: Chat;

    private readonly Chatra: (...args: any[]) => void;

    private constructor() {
        this.Chatra = (<any>window).Chatra;
    }

    public static getInstance(): Chat {
        if (!this.instance) {
            this.instance = new Chat();
        }
        return this.instance;
    }

    public setUserData(user: User): void {
        if (!this.Chatra) {
            return;
        }

        if (!user.isLoggedIn()) {
            this.Chatra('setIntegrationData', null);
            return;
        }

        this.Chatra('setIntegrationData', {
            name: user.getFullName(),
            email: user.getEmail()
        });

        if (user.isFeatureEnabled(EngineeringToolFlag.CHAT_HIDE)) {
            this.hide();
        }
    }

    public show(): void {
        this.Chatra('show');
    }

    public hide(): void {
        this.Chatra('hide');
    }
}

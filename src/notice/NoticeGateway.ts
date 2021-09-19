import {ServerGateway} from "../core/ServerGateway";
import Notice from "./Notice";

export interface NoticeGateway {
    getNotices(): JQuery.jqXHR<Notice[]>;
}

class DefaultGateway extends ServerGateway implements NoticeGateway {
    public getNotices(): JQuery.jqXHR<Notice[]> {
        return this.get('/api/v3/marketing/notice/')
            .then(results => results.map(result => new Notice(result))) as JQuery.jqXHR<Notice[]>;
    }
}

export function getNoticeGateway(): NoticeGateway {
    return new DefaultGateway();
}

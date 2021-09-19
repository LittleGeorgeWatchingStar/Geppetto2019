import * as React from "react";
import * as ReactDOM from "react-dom";
import Notice from "./Notice";
import {NoticeComponent} from "./NoticeComponent";
import {getNoticeGateway} from "./NoticeGateway";

function displayNotice() {
    const gateway = getNoticeGateway();
    gateway.getNotices().done((notices: Notice[]) => {
        if (notices.length > 0) {
            const el = <NoticeComponent notices={notices}/>;
            ReactDOM.render(el, $('#notices-view').get(0));
        }
    });
}

function init() {
    displayNotice();
}

export default {
    init: init
}

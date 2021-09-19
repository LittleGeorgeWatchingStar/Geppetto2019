import 'jquery';
import {Dialog} from 'view/Dialog';

export default class MarketingDialog extends Dialog {

    initialize(options) {
        super.initialize(options);

        const dialog = this;
        const slides = this.$('.slide');

        slides.hide();

        let active = slides.first().show();

        this.$el.css('overflow', 'hidden');

        dialog.$('.carousel').height(active.height());

        setInterval(() => {
            const last = active;

            if (active.next().length) {
                active = active.next();
            } else {
                active = slides.first();
            }

            dialog.$('.carousel').animate({height: active.height()});
            last.hide('slide', {direction: 'left'});
            active.show('slide', {direction: 'right'});
        }, 5000);

        return this;
    }
}

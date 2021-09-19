import * as $ from 'jquery';
import * as _ from 'underscore';
import * as Backbone from 'backbone';
import {Model, ViewOptions} from 'backbone';
import DialogManager from "./DialogManager";


/**
 * The constructor/initialize options passed to Dialog.
 */
export interface DialogOptions<TModel extends Model> extends ViewOptions<TModel>, JQueryUI.DialogOptions {
    /**
     * The HTML to display in the dialog.
     */
    html?: string;
}

/**
 * A dialog popup.
 */
export abstract class AbstractDialog<TModel extends Model> extends Backbone.View<TModel> {
    private closed: boolean;

    constructor(options: DialogOptions<TModel>) {
        super(options);
    }

    initialize(options: DialogOptions<TModel>) {
        this.closed = false;

        /**
         * This function gets called unqualified in cases like the following,
         * hence make sure it's bound to this.
         *
         *   var dialog = new Dialog();
         *   dialog.alert(dialog.close);
         */
        this.close = this.close.bind(this);

        _.defaults(options, {
            modal: true,
            resizable: false
        });

        if (options.hasOwnProperty('html')) {
            this.$el.html(options.html);
        }

        this.$el.dialog(options);
        this.$el.on("dialogclose", this.close);
        this.$el.siblings('.ui-dialog-titlebar')
            .on('dblclick', this.maximize.bind(this));

        return this;
    }

    maximize() {
        if (this.$el.dialog('option', 'resizable')) {
            this.$el.parent().css({
                top: 0,
                left: 0,
                padding: 0,
                border: 0
            });

            this.option({
                width: $('body').width(),
                height: $('body').height()
            });

            this.$el.trigger('dialogresize');
        }
    }

    title(title) {
        this.$el.dialog('option', 'title', title);
        return this;
    }

    getButton(button_text) {
        return this.$el
            .closest('.ui-dialog')
            .find('.ui-dialog-buttonpane button')
            .filter(function () {
                return $(this).find('.ui-button-text').html() === button_text;
            })
            .filter(':first');
    }

    buttons(buttons, default_button_text?) {
        this.$el.dialog('option', 'buttons', buttons);
        if (default_button_text) {
            this.getButton(default_button_text).focus();
        }
        return this;
    }

    text(content) {
        this.$el.text(content);
        return this;
    }

    alert(callback?) {
        const close = this.makeButton('Close', callback);
        this.buttons([close], 'Close');
        return this;
    }

    makeButton(text: string, callback?, context?) {
        const inner = () => {
            this.close();
            if (callback) {
                callback.call(context);
            }
        };
        return {
            text: text,
            click: inner.bind(this)
        };
    }

    confirm(ok_callback, cancel_callback?, default_button_text?) {
        const buttons = [
            this.makeButton('OK', ok_callback),
            this.makeButton('Cancel', cancel_callback)
        ];

        this.buttons(buttons, default_button_text || 'Cancel');
        return this;
    }

    textAndOk(content, ok_callback?) {
        this.text(content);
        const buttons = [
            this.makeButton('OK', ok_callback)
        ];

        this.buttons(buttons, 'OK');
        return this;
    }

    waiting() {
        this.$el.html('<div><div class="loading"></div></div>');
        return this;
    }

    option(optionsObj: any) {
        const options = _.toArray(arguments);
        options.unshift('option');
        this.$el.dialog.apply(this.$el, options);
        return this;
    }

    /**
     * Recentre this dialog relative to the window, eg. when the contents change dynamically so that
     * the dialog size changes.
     */
    center(): void {
        this.$el.dialog('option', 'position', {my: 'center', at: 'center', of: window});
    }

    open() {
        this.$el.dialog('open');
        return this;
    }

    close() {
        // TODO calling close when dialog no longer exists (perhaps due to node removal)
        // is causing inconsistent exceptions in tests.
        if (!this.$el.dialog('instance')) {
            return;
        }
        if (!this.closed) {
            this.closed = true;
            this.$el.dialog('close');
            this.remove();
            DialogManager.close(this);
            this.onClose();
        }
    }

    protected isClosed(): boolean {
        return this.closed;
    }
    /**
     * @override to implement custom on-close behaviour.
     */
    protected onClose(): void {
    }
}


/**
 * Exists to make Typescript happy.
 */
class DialogModel extends Backbone.Model {}

/**
 * A dialog with no actual model.
 */
export class Dialog extends AbstractDialog<DialogModel> {}

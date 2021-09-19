/*global define*/
define(function (require) {

    "use strict";

    var $ = require('jquery');

    $.fn.move = function (increment) {

        this.each(function (index, value) {
            var element = $(this),
                offset  = element.offset();
            element.offset({left: (offset.left + increment.left), top: (offset.top + increment.top)});
        });

        return null;
    };

});

/*jslint nomen: true */
YUI.add('mojito-debug-application', function (Y, NAME) {
    'use strict';

    function DebugApplication(appIframe, appHtml) {
        this.appIframe = appIframe;
        this.appWindow = appIframe._node.contentWindow;
        this.appWindow.document.open();
        this.appWindow.document.write(appHtml);
        this.appWindow.document.close();

        this.opened = false;
    }

    DebugApplication.prototype = {

        init: function (callback) {
            var appIframe = this.appIframe,
                appWindow = this.appWindow;

            if (Y.Debug.mode !== 'hide') {
                appWindow.onload = function () {
                    appIframe.setStyle('height', appWindow.document.body.scrollHeight + "px");
                    callback();
                };
            } else {
                callback();
            }
        },

        open: function (anim) {
            var self = this;

            if (!self.appWindow.document.body) {
                self.appWindow.onload = function () {
                    self.toggle(anim, 'show');
                };
            } else {
                self.toggle(anim, 'show');
            }
        },

        close: function (anim) {
            this.toggle(anim, 'hide');
        },

        toggle: function (anim, state) {
            if (!state) {
                this.opened = !this.opened;
            } else if (state === 'show') {
                this.opened = true;
            } else {
                this.opened = false;
            }

            this.appIframe.transition({
                easing: 'ease-out',
                duration: anim ? 0.3 : 0,
                height: this.opened ? this.appWindow.document.body.scrollHeight + "px" : '0px'
            });
        }
    };

    Y.namespace('mojito.debug').Application = DebugApplication;
}, '0.0.1', {
    requires: [
        'mojito-debug-addon'
    ]
});

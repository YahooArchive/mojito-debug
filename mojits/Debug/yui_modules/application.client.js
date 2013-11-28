/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true */
/*global YUI */

YUI.add('mojito-debug-application', function (Y, NAME) {
    'use strict';

    function DebugApplication(iframe, appHtml) {
        this.iframe = iframe;
        this.window = iframe._node.contentWindow;
        this.window.document.open();
        this.window.document.write(appHtml);
        this.window.document.close();

        this.opened = false;
    }

    DebugApplication.prototype = {

        init: function (callback) {
            var iframe = this.iframe,
                window = this.window;

            if (Y.Debug.mode !== 'hide') {
                window.onload = function () {
                    this.open();
                    callback();
                }.bind(this);
            } else {
                callback();
            }
        },

        open: function (anim) {
            var self = this;

            if (!self.window.document.body) {
                self.window.onload = function () {
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

            // Set iframe height to auto such that the document inside returns the correct scrollheight
            if (this.opened) {
                this.iframe.setStyle('height', 'auto');
            }

            this.iframe.transition({
                easing: 'ease-out',
                duration: anim ? 0.3 : 0,
                height: this.opened ? this.window.document.body.scrollHeight + "px" : '0px'
            });

            if (this.opened) {
                this.timeout = setInterval(function () {
                    try {
                        this.iframe.setStyle('height', this.window.document.body.scrollHeight + "px");
                    } catch (e) {
                        clearTimeout(this.timeout);
                    }
                }.bind(this), 200);
            } else {
                clearTimeout(this.timeout);
            }
        }
    };

    Y.namespace('mojito.debug').Application = DebugApplication;
}, '0.0.1', {
    requires: [
        'mojito-debug-addon'
    ]
});

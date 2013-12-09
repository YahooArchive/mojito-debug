/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true */
/*global YUI */

YUI.add('mojito-debug-application', function (Y, NAME) {
    'use strict';

    function DebugApplication(iframe, html) {
        this.iframe = iframe;
        this.window = iframe._node.contentWindow;
        this.opened = false;

        this.window.document.open();
        this.window.document.write(html);
        this.window.document.close();
    }

    DebugApplication.prototype = {

        init: function (callback) {
            var self = this,
                window = self.window,
                document = window.document,
                done;

            if (Y.Debug.mode === 'hide') {
                this.initCallback = callback;
            } else {
                if (window.addEventListener) {
                    done = function () {
                        self.open(false, callback);
                        window.removeEventListener('load', done, false);
                    };
                    window.addEventListener('load', done, false);
                } else if (window.attachEvent) {
                    done = function () {
                        self.open(false, callback);
                        window.detachEvent('load', done);
                    };
                    window.attachEvent('load', done);
                }
            }
        },

        open: function (anim, done) {
            var self = this;

            if (this.initCallback) {
                done = this.initCallback;
                delete this.initCallback;
            }

            if (!self.window.document.body) {
                self.window.onload = function () {
                    self._toggle(anim, 'show', done);
                };
            } else {
                self._toggle(anim, 'show', done);
            }
        },

        close: function (anim) {
            this._toggle(anim, 'hide');
        },

        _toggle: function (anim, state, done) {
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
                height: this.opened ? this.window.document.body.scrollHeight + 'px' : '0px'
            });

            if (done) {
                done();
            }

            if (this.opened) {
                this.timeout = setInterval(function () {
                    try {
                        this.iframe.setStyle('height', this.window.document.body.scrollHeight + 'px');
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

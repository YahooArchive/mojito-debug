/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true, regexp: true */
/*global YUI */

YUI.add('mojito-debug-application', function (Y, NAME) {
    'use strict';

    function DebugApplication(iframe, flushes, simulateFlushing, callback) {
        var self = this,
            startTime;

        this.iframe = iframe;
        this.document = iframe._node.contentDocument;
        this.window = iframe._node.contentWindow;
        this.opened = Y.Debug.mode !== 'hide';

        self.window.document.open();

        Y.Array.each(flushes, function (flush, i) {
            var flushTime = simulateFlushing ? flush.time : 0,
                writeFlushData = function () {
                    if (i === 0) {
                        startTime = Y.mojito.Waterfall.now();
                        Y.Debug.on('waterfall', function (debugData) {
                            debugData.clientAbsoluteStartTime = Y.mojito.Waterfall.now();
                        });
                    }

                    var currentTime = Y.mojito.Waterfall.now(),
                        delay = currentTime - startTime;

                    // Sometimes setTimeout calls the callback before the specified delay.
                    // If this happens then set another timeout with the remaining delay.
                    // This ensures that flush data are not written ahead of time.
                    // Runtime tests show that doing this makes the writing of flush data
                    // at most 1 ms late.
                    if (delay < flushTime) {
                        setTimeout(writeFlushData, flushTime - delay);
                        return;
                    }

                    self.window.document.write(flush.data);

                    if (i === 0) {
                        self._catchLinkNavigation();
                    }

                    if (self.opened) {
                        self.iframe.setStyle('height', 'auto');
                        self.iframe.setStyle('height', self.window.document.body.scrollHeight + 'px');
                    }
                    if (i === flushes.length - 1) {
                        self.window.document.close();
                        self._catchFormNavigation();
                        self.init(callback);
                    }
                };

            setTimeout(writeFlushData, flushTime);
        });
    }

    DebugApplication.prototype = {

        init: function (callback) {
            var self = this,
                iframe = self.iframe,
                window = self.window,
                loaded = false;

            if (Y.Debug.mode !== 'hide') {
                self.open(false);
            }

            // Hide the page when the application is unloading,
            // this is useful if the application reloads without a click to a link
            // or submitting a form. When this happens the application is out of sync
            // with the debugger until it finishes loading and the debugger reloads the page
            // with the new application url.
            Y.Node(window).on('unload', function () {
                Y.Debug.binder.node.hide();
            });

            iframe.on('load', function () {
                if (loaded) {
                    // If the application iframe has already loaded then a subsequent load
                    // means that the application was reloaded and the debugger didn't catch it.
                    // This reloads the entire page with the new application url such that the debugger
                    // and the application remain in sync.
                    self._navigateToUrl(window.location.href);
                    return;
                }

                loaded = true;
                callback();
            });
        },

        _urlIsInternal: function (url) {
            var m = url.match(/https?:\/\/([^\/]+)/),
                host = m && m[1];
            return host === window.location.host;
        },

        _addDebugParam: function (url) {
            var parts = url.split('?'),
                params = Y.Debug.binder.getUrlParams(parts[1]),
                paramArray = [],
                currentHooks = Y.Debug.binder.history.get('hooks'),
                currentMode = Y.Debug.binder.history.get('mode'),
                debugParam = 'debug' + (currentMode ? '.' + currentMode : '');

            // Remove any debug params.
            Y.Object.each(params, function (value, param) {
                if (/debug\.?/.test(param)) {
                    delete params[param];
                }
            });

            // Set the debug param to the current enabled hooks
            params[debugParam] = currentHooks.join(',');

            // Navigate to the new url
            Y.Object.each(params, function (value, param) {
                paramArray.push(param + (value !== null ? '=' + value : ''));
            });

            return parts[0] + '?' + paramArray.join('&');
        },

        _navigateToUrl: function (url) {
            // If the url is internal, then update the debug param with the current hooks
            // and navigate to the url.
            if (this._urlIsInternal(url)) {
                url = this._addDebugParam(url);
            }
            window.location.href = url;
        },

        _catchLinkNavigation: function () {
            var self = this,
                body = Y.Node(this.document.body);

            // Catch link clicks on the application in the iframe in order to
            // refresh the entire page with the current debug hooks.
            body.delegate('click', function (e) {
                var url = e.target.get('href');
                if (url) {
                    e.preventDefault();
                    self._navigateToUrl(url);
                }
            }, 'a');
        },

        _catchFormNavigation: function () {
            var self = this,
                body = Y.Node(this.document.body);

            body.all('form').on('submit', function (e) {
                var form = e.currentTarget,
                    url = form.get('action'),
                    parts,
                    paramsArray = [];

                if (url) {
                    parts = url.split('?');
                } else {
                    return;
                }

                e.halt(true);

                // Add params given form's children input values.
                form.all('input').each(function (input) {
                    var name = input.get('name');
                    if (name) {
                        paramsArray.push(name + '=' + input.get('value'));
                    }
                });

                if (parts[1]) {
                    paramsArray.unshift(parts[1]);
                }

                if (paramsArray.length > 0) {
                    url = parts[0] + '?' + paramsArray.join('&');
                }

                self._navigateToUrl(url);
            }, 'form');
        },

        open: function (anim, done) {
            var self = this;

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
        'node',
        'mojito-debug-addon',
        'mojito-waterfall'
    ]
});

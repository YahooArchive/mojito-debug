/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true */
/*global YUI */

YUI.add('mojito-debug-addon', function (Y, NAME) {
    'use strict';

    var NOOP = function () {},
        isBrowser = typeof window === 'object';

    function DebugAddon(command, adapter, ac) {
        var self = this,
            root = isBrowser ? window.top : adapter.req,
            debugParam;

        // Ensure debugger is a singleton per request.
        if (!root.globals) {
            root.globals = {};
        }
        if (!root.globals.debug) {
            root.globals.debug = self;
        } else {
            return root.globals.debug;
        }

        this.mode = ac.params.params.url.hasOwnProperty('debug') ? '' :
                        ac.params.params.url.hasOwnProperty('debug.hide') ? 'hide' :
                        ac.params.params.url.hasOwnProperty('debug.json') ? 'json' : null;

        // Do nothing if the debug parameter is not present.
        if (this.mode === null) {
            return;
        }

        if (!isBrowser) {
            self.hooks = {};
            // Get config, make sure the help hook appears first.
            self.config = {
                hooks: {
                    help: command.instance.config.hooks.help
                }
            };
            Y.mix(self.config, command.instance.config, false, null, 0, true);

            // Add configuration hooks into 'all' alias.
            Y.Object.each(self.config.hooks, function (hookConfig, hook) {
                if (self.config.aliases.all.indexOf(hook) === -1) {
                    self.config.aliases.all.push(hook);
                }
            });

            // Determine all the active hooks specified in the debug parameter.
            // If no hook specified, use 'all' by default.
            debugParam = ac.params.url('debug' + (this.mode ? '.' + this.mode : '')) || 'all';
            self.urlHooks = debugParam.split(/\s*,\s*/);
            Y.Array.each(self.urlHooks, function (hook) {
                if (!hook) {
                    return;
                }

                if (hook === 'all') {
                    self.allHooksEnabled = true;
                } else if (self.config.aliases.all.indexOf(hook) === -1) {
                    self.config.aliases.all.push(hook);
                }

                Y.Array.each(self.config.aliases[hook] || [hook], function (hook) {
                    self._initHook(hook);
                });
            });
        }

        self.on = function (hook, callback) {
            if (!self.hooks[hook]) {
                if (self.allHooksEnabled) {
                    self.config.aliases.all.push(hook);
                    self._initHook(hook);
                } else {
                    return;
                }
            }

            callback(self.hooks[hook].debugData);

            // If this is the browser, render this debug hook
            if (isBrowser) {
                self._render(function () {
                    //self._binder.update();
                }, hook);
            }
        };

        self._render = function (done, hook) {
            var hooksToRender = {};

            Y.Array.each(hook ? [hook] : Y.Object.keys(self.hooks), function (hook) {
                // Render this hook if it's config specifies a base or a type.
                if (self.hooks[hook].config && (self.config.hooks[hook].base || self.config.hooks[hook].type)) {
                    hooksToRender[hook] = Y.clone(self.config.hooks[hook]);
                    hooksToRender[hook].params = hooksToRender[hook].params || {};
                    hooksToRender[hook].params.body = hooksToRender[hook].params.body || {};
                    hooksToRender[hook].params.body.debugData = self.hooks[hook].debugData;
                } else {
                    // Otherwise this hook will be considered rendered
                    self.hooks[hook].needsUpdate = true;
                }
            });

            if (Y.Object.isEmpty(hooksToRender)) {
                return done(self.hooks, {});
            }

            ac.composite.execute({
                children: hooksToRender
            }, function (renderedHooks, meta) {
                Y.Object.each(renderedHooks, function (content, hook) {
                    self.hooks[hook].debugData.content = content;
                    self.hooks[hook].needsUpdate = true;
                });

                done(self.hooks, meta);
            });
        };
    }

    DebugAddon.prototype = {
        namespace: 'debug',
        on: NOOP,
        _initHook: function (hook) {
            var self = this;
            if (self.hooks[hook]) {
                return;
            }
            // Make sure the config includes all hooks mentioned in the debug param.
            self.config.hooks[hook] = self.config.hooks[hook] || {};

            self.hooks[hook] = {
                config: self.config.hooks[hook],
                debugData: {}
            };

            // Make sure each hook has a title and description.
            if (!self.config.hooks[hook].title) {
                self.config.hooks[hook].title = hook.substring(0, 1).toUpperCase() + hook.substring(1);
            }
            if (!self.config.hooks[hook].description) {
                self.config.hooks[hook].description = self.config.hooks[hook].title + '.';
            }
        }
    };

    Y.namespace('mojito.addons.ac').debug = DebugAddon;

    if (isBrowser) {
        Y.Debug = window.top.DEBUGGER;
    }
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-composite-addon',
        'mojito-params-addon'
    ]
});

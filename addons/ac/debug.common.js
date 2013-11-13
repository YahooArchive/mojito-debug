/*jslint nomen: true */

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
            self.config = command.instance.config;
            self.config.hooks = self.config.hooks || {};

            // Make sure each hook has a title and description.
            Y.Object.each(self.config.hooks, function (hookConfig, hookName) {
                if (!hookConfig.title) {
                    hookConfig.title = hookName;
                }
                if (!hookConfig.description) {
                    hookConfig.description = hookConfig.title + '.';
                }
            });

            // Determine all the active hooks specified in the debug parameter.
            // If no hook specified, use 'help' by default.
            debugParam = ac.params.url('debug' + (this.mode ? '.' + this.mode : '')) || 'help';
            Y.Array.each(debugParam.split(/\s*,\s*/), function (hook) {
                if (!hook) {
                    return;
                }
                self.hooks[hook] = {
                    config: self.config.hooks[hook] || {},
                    debugData: {}
                };
            });
        }

        self.on = function (hook, callback) {
            if (!self.hooks[hook]) {
                return;
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
                    self.hooks[hook].debugData = {
                        content: content
                    };
                    self.hooks[hook].needsUpdate = true;
                });
                done(self.hooks, meta);
            });
        };
    }

    DebugAddon.prototype = {
        namespace: 'debug',
        on: NOOP
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

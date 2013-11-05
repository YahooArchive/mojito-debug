/*jslint nomen: true */

YUI.add('mojito-debug-addon', function (Y, NAME) {
    'use strict';

    var NOOP = function () {},
        isBrowser = typeof window === 'object';

    function DebugAddon(command, adapter, ac) {
        var self = this,
            root = isBrowser ? window.top : adapter.req,
            debugParam = ac.params.url('debug');

        // Ensure debugger is a singleton per request.
        if (!root.globals) {
            root.globals = {};
        }
        if (!root.globals.debug) {
            root.globals.debug = self;
        } else {
            return root.globals.debug;
        }

        // Do nothing if the debug parameter is not present.
        if (!debugParam) {
            return;
        }

        if (!isBrowser) {
            self.hooks = {};
            self.config = command.instance.config;
            self.config.hooks = self.config.hooks || {};

            Y.Array.each(debugParam.split(/\s*,\s*/), function (hook) {
                self.hooks[hook] = {
                    config: self.config.hooks[hook],
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
                    //self._update();
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
                return;
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

        if (isBrowser) {
            self.hookContainers = {};
            self._update = function () {
                Y.Object.each(self.hooks, function (hook, hookName) {
                    if (!hook.needsUpdate) {
                        return;
                    }

                    if (!self.hookContainers[hookName]) {
                        self.hookContainers[hookName] = new Y.mojito.debug.HookContainer(hookName, hook);
                        Y.one('#debugger').append(self.hookContainers[hookName]);
                    } else {
                        self.hookContainers[hookName].updateContent(hook);
                    }
                });
            };
        }
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
        'mojito-params-addon',
        'mojito-debug-hook-container',
        'mojito-debug-generic-hook'
    ]
});

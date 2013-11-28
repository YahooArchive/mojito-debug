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

        self.ac = ac;
        self.mode = ac.params.params.url.hasOwnProperty('debug') ? '' :
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
                self._initHookConfig(hook);
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

        this.on = this._on;
        this.log = this._log;
        this.setContent = this._setContent;
        this.appendContent = this._appendContent;
        this.get = this._get;
    }

    DebugAddon.prototype = {
        namespace: 'debug',

        on: NOOP,

        log: NOOP,

        setContent: NOOP,

        appendContent: NOOP,

        get: NOOP,

        render: NOOP,

        _on: function (hook, callback) {
            if (!this.hooks[hook]) {
                if (this.allHooksEnabled) {
                    this.config.aliases.all.push(hook);
                    this._initHook(hook);
                } else {
                    return;
                }
            }

            callback(this.hooks[hook].debugData);
        },

        _log: function (line) {
            var hook = 'log';
            this.on(hook, function (debugData) {
                debugData._append.push(line);
                this.hooks[hook]._modified = true;
                this.render(hook);
            }.bind(this));

        },

        _setContent: function (hook, content) {
            this.on(hook, function (debugData) {
                debugData._content = content;
                this.hooks[hook]._modified = true;
                this.render(hook);
            }.bind(this));
        },

        _appendContent: function (hook, content) {
            this.on(hook, function (debugData) {
                debugData._append.push(content);
                this.hooks[hook]._modified = true;
                this.render(hook);
            }.bind(this));
        },

        _get: function (hook) {
            return this.hooks[hook];
        },

        _render: function (hooks, done) {
            var self = this,
                ac = self.ac,
                hooksToRender = {};

            if (typeof hooks === 'function') {
                done = hooks;
                hooks = null;
            }

            hooks = !hooks ? Y.Object.keys(self.hooks) : typeof hooks === 'string' ? [hooks] : hooks;

            Y.Array.each(hooks, function (hook) {
                if (!self.hooks[hook] || !self.hooks[hook]._modified) {
                    return;
                }
                // Render this hook if it's config specifies a base or a type.
                if (self.hooks[hook].config && (self.config.hooks[hook].base || self.config.hooks[hook].type)) {
                    hooksToRender[hook] = Y.clone(self.config.hooks[hook]);
                    hooksToRender[hook].params = hooksToRender[hook].params || {};
                    hooksToRender[hook].params.body = hooksToRender[hook].params.body || {};
                    hooksToRender[hook].params.body.debugData = self.hooks[hook].debugData;
                } else {
                    self.hooks[hook]._modified = false;
                    self.hooks[hook]._rendered = true;
                }
            });

            if (Y.Object.isEmpty(hooksToRender)) {
                return done && done(Y.mix({}, self.hooks, true, hooks), {});
            }

            ac.composite.execute({
                children: hooksToRender
            }, function (renderedHooks, meta) {
                Y.Object.each(meta.children, function (hookMeta, hook) {
                    self.hooks[hook]._instanceId = hookMeta.instanceId;
                });
                Y.Object.each(renderedHooks, function (content, hook) {
                    self.hooks[hook].debugData._content = content;
                    self.hooks[hook]._modified = false;
                    self.hooks[hook]._rendered = true;
                });

                return done && done(Y.mix(self.hooks, self.hooks, true, hooks), meta);
            });
        },

        _initHook: function (hook) {
            var self = this;
            if (self.hooks[hook]) {
                return;
            }
            // Make sure the config includes all hooks mentioned in the debug param.
            self.config.hooks[hook] = self.config.hooks[hook] || {};

            self.hooks[hook] = {
                config: self.config.hooks[hook],
                _modified: true,
                debugData: {
                    _content: null,
                    _append: []
                }
            };

            self._initHookConfig(hook);
        },

        _initHookConfig: function (hook) {
            // Make sure each hook has a title and description.
            if (!this.config.hooks[hook].title) {
                this.config.hooks[hook].title = hook.substring(0, 1).toUpperCase() + hook.substring(1);
            }
            if (!this.config.hooks[hook].description) {
                this.config.hooks[hook].description = this.config.hooks[hook].title + '.';
            }
        }
    };

    Y.namespace('mojito.addons.ac').debug = DebugAddon;

    if (isBrowser) {
        if (window.top.DEBUGGER) {
            Y.Debug = window.top.DEBUGGER;
            //Y.Debug.binder._hookIntoMojitProxy.call(Y.Debug.binder, Y);
        } else {
            Y.Debug = {};
            Y.mix(Y.Debug, DebugAddon.prototype);
        }
    }
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-composite-addon',
        'mojito-params-addon'
    ]
});

/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true, plusplus: true */
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
        if (!root.globals[NAME]) {
            root.globals[NAME] = self;
        } else {
            return root.globals[NAME];
        }

        self.ac = ac;
        self.mode = ac.params.params.url.hasOwnProperty('debug') ? '' :
                    ac.params.params.url.hasOwnProperty('debug.hide') ? 'hide' :
                        ac.params.params.url.hasOwnProperty('debug.json') ? 'json' : null;

        // Do nothing if the debug parameter is not present.
        if (self.mode === null) {
            return;
        }

        if (!isBrowser) {
            if (!command.instance.config.hooks) {
                return;
            }

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
            debugParam = ac.params.url('debug' + (self.mode ? '.' + self.mode : '')) || 'all';
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

        self.enabled = true;

        self.on = self._on;
        self.log = self._log;
        self.setContent = self._setContent;
        self.appendContent = self._appendContent;
        self.error = self._error;
        self.clear = self._clear;
        self.get = self._get;
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

            this.hooks[hook]._modified = true;

            try {
                callback(this.hooks[hook].debugData, this.hooks[hook]);
            } catch (e) {
                this.error(hook, {
                    message: 'Error in a callback passed to ac.debug.on',
                    exception: e
                }, 'error');
            }
        },

        _log: function (line) {
            var hook = 'log';
            this.on(hook, function (debugData) {
                debugData._append.push(line);
                this.render(hook);
            }.bind(this));

        },

        _setContent: function (hook, content) {
            this.on(hook, function (debugData) {
                debugData._content = content;
                this.render(hook);
            }.bind(this));
        },

        _appendContent: function (hook, content) {
            this.on(hook, function (debugData) {
                debugData._append.push(content);
                this.render(hook);
            }.bind(this));
        },

        _error: function (hook, error, type, name) {
            this.on(hook, function (debugData) {
                var message = error,
                    exception,
                    exceptionMessage,
                    stack,
                    colon;

                if (Y.Lang.isObject(error)) {
                    if (error.exception) {
                        message = error.message;
                        exception = error.exception;
                    } else {
                        message = '';
                        exception = error;
                    }
                    exceptionMessage = exception.message || '';
                    stack = exception.stack || '';
                    colon = (message && exceptionMessage) ? ': ' : '';

                    Y.log(message + colon + exceptionMessage + '\n' + stack , 'error', name || NAME);
                    exceptionMessage = '<span class="exception" title="' + stack + '">' + exceptionMessage + '</span>';

                    message = (message + colon + exceptionMessage);
                } else {
                    Y.log(error, 'error');
                }

                debugData._errors.push('<div class="' + (type || 'error') + '">' + (message || type || 'erorr') + '</div>');
                this.render(hook);
            }.bind(this));
        },

        _clear: function (hookName, whitelist) {
            var hook = this.hooks[hookName],
                debugData = hook && hook.debugData;
            if (hook) {
                hook.debugData = {
                    _errors: debugData._errors,
                    _append: debugData._append,
                    _content: debugData._content
                };

                if (whitelist) {
                    Y.mix(hook.debugData, debugData, false, whitelist);
                }
            }
        },

        _get: function (hook) {
            return this.hooks[hook];
        },

        _render: function (hooks, done) {
            var self = this,
                ac = self.ac,
                hooksToRender = {},
                numHooksToRender = 0,
                mergedMeta = {};

            if (typeof hooks === 'function') {
                done = hooks;
                hooks = null;
            }

            if (hooks) {
                hooks = typeof hooks === 'string' ? [hooks] : hooks;
                // Mark hooks that were specifically specified as modified to make sure they are rendered.
                Y.Array.each(hooks, function (hook) {
                    self.hooks[hook]._modified = true;
                });
            } else {
                hooks = Y.Object.keys(self.hooks);
            }

            Y.Array.each(hooks, function (hookName) {
                var hook = self.hooks[hookName];
                if (!hook || !hook._modified) {
                    return;
                }

                hook._modified = false;

                if (hook.debugData._errors.length > 0) {
                    // Do not attempt to render this hook if it has errors,
                    // otherwise the rendering may result in more errors,
                    // resulting in an infinite loop.
                    hook._rendered = true;
                } else if (hook.binder && hook.binder.render) {
                    // The hook has a binder with a render function,
                    // which is used to render this hook.
                    hook.binder.render(hook.node, hook.debugData);
                    hook._rendered = true;
                } else if (hook.config && (hook.config.base || hook.config.type)) {
                    // Render this hook if it's config specifies a base or a type.
                    numHooksToRender++;
                    // It's important to clone the config instead of using it directly,
                    // because it should not be modified; otherwise there can be interference,
                    // and the added params will be sent to the client.
                    hooksToRender[hookName] = Y.clone(hook.config);
                    hooksToRender[hookName].params = hook.params || {};
                    hooksToRender[hookName].params.body = (hook.params && hook.params.body) || {};
                    hooksToRender[hookName].params.body.debugData = hook.debugData;
                    hooksToRender[hookName].params.body.hook = hookName;
                } else {
                    // This is a simple hook that will rendered according to _content/_append in debugData.
                    hook._rendered = true;
                }
            });

            if (Y.Object.isEmpty(hooksToRender)) {
                return done && done(Y.mix(self.hooks, self.hooks, true, hooks), mergedMeta);
            }

            Y.Object.each(hooksToRender, function (hook, hookName) {
                var command = {
                        instance: hook,
                        action: hook.action || 'index',
                        context: ac.context,
                        params: hook.params
                    },
                    adapter = new Y.mojito.debug.OutputHandler(hookName + '-hook', function (err, data, meta) {
                        var hook = self.hooks[hookName];

                        if (err) {
                            self.error(hookName, 'Rendering failed (check for server-side errors): ' + err, 'error');
                        } else {
                            mergedMeta = Y.mojito.util.metaMerge(mergedMeta, meta);

                            hook.debugData._content = data;
                            hook._viewId = meta.view.id;
                        }

                        hook._rendered = true;

                        if (--numHooksToRender === 0) {
                            return done && done(Y.mix(self.hooks, self.hooks, true, hooks), mergedMeta);
                        }
                    }, self.MojitoClient);

                Y.mix(adapter, ac._adapter);

                ac._dispatch(command, adapter);
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
                _modified: true,
                _rendered: false,
                config: self.config.hooks[hook],
                debugData: {
                    _errors: [],
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
        },

        _decycleHooks: function (hooks) {
            var self = this,
                serializedHooks = {},
                JSON_DEPTH_LIMIT = 5;
            Y.Object.each(hooks, function (hook, hookName) {
                // TODO: revisit converting the json into an object that references itself.
                try {
                    JSON.stringify(hook);
                    // we know it has no cycles so just copy the object while stringifing functions, no depth limit.
                    serializedHooks[hookName] = Y.mojito.debug.Utils.removeCycles(hook, 0, true, true);
                } catch (e) {
                    self.error(hookName, 'Unable to serialize debugData: "' + e.message
                        + '". debugData has been decycled and limited to a depth of ' + (JSON_DEPTH_LIMIT - 1) + '.', 'warning');
                    serializedHooks[hookName] = Y.mojito.debug.Utils.removeCycles(hook, JSON_DEPTH_LIMIT, true);
                }
            });

            return serializedHooks;
        }
    };

    Y.namespace('mojito.addons.ac').debug = DebugAddon;

    if (isBrowser) {
        if (window.top.DEBUGGER) {
            Y.Debug = window.top.DEBUGGER;
        } else {
            Y.Debug = {};
            Y.mix(Y.Debug, DebugAddon.prototype);
        }
    }
}, '0.0.1', {
    requires: [
        'mojito-composite-addon',
        'mojito-params-addon',
        'mojito-debug-output-handler',
        'mojito-util'
    ]
});

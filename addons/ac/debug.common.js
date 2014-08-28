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
                        ac.params.params.url.hasOwnProperty('debug.json') ? 'json' :
                                !isBrowser && ac._adapter.req.url.indexOf('/debug') === 0 ? '' : null;

        self.timing = {
            client: {},
            server: {}
        };

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
            // If no hook specified, use 'help' by default.
            debugParam = ac.params.url('debug' + (self.mode ? '.' + self.mode : '')) || 'help';
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
        self.once = self._once;
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

        _on: function (type, callback, once) {
            var parts = type.split(':'),
                hook = parts[0],
                event = parts[1],
                errorMessage = 'Error in a callback passed to ac.debug.on',
                originalCallback = callback;

            if (!event && !this.hooks[hook]) {
                if (this.allHooksEnabled) {
                    this.config.aliases.all.push(hook);
                    this._initHook(hook);
                } else {
                    return;
                }
            }

            // Wrap the callback with a try-catch in order to report any errors
            // occurring after calling callback.
            callback = function () {
                try {
                    originalCallback.apply(this, arguments);
                } catch (e) {
                    if (this.hooks[hook]) {
                        this.error(hook, {
                            message: errorMessage,
                            exception: e
                        }, 'error');
                    } else {
                        Y.log(errorMessage + '(' + type + ')', NAME);
                    }
                }
            }.bind(this);

            if (event) {
                return Y[once ? 'once' : 'on'](hook + ':' + event, callback);
            }

            this.hooks[hook]._modified = true;

            callback(this.hooks[hook].debugData, this.hooks[hook]);
        },

        _once: function (type, callback) {
            return this.on(type, callback, true);
        },

        _log: function (line, options) {
            var hook = 'log';
            this.on(hook, function (debugData) {
                if (Y.Lang.isObject(line) && Y.Lang.isObject(options)) {
                    line = {
                        json: line,
                        options: options
                    };
                } else if (Y.Lang.isString(line) && Y.Lang.isString(options)) {
                    line = '<span class="' + options + '">' + line + '</span>';
                }
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

        _setJson: function (hook, json) {
            this.on(hook, function (debugData) {
                debugData._json = json;
            });
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
                    colon,
                    escapeHTML = function (html) {
                        return html.replace(/[&<>]/gm, function (tag) {
                            switch (tag) {
                            case '<':
                                return '&lt;';
                            case '>':
                                return '&gt;';
                            case '&':
                                return '&amp;';
                            default:
                                return tag;
                            }
                        });
                    };

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

                    Y.log(message + colon + exceptionMessage + '\n' + stack, 'error', name || NAME);
                    exceptionMessage = '<span class="exception" title="' + stack + '">' + escapeHTML(exceptionMessage) + '</span>';

                    message = (escapeHTML(message) + colon + exceptionMessage);
                } else {
                    Y.log(error, 'error', name || NAME);
                    message = escapeHTML(message);
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
                    _content: debugData._content,
                    _json: debugData._json
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
                var hook = self.hooks[hookName],
                    prepareToRender;

                if (!hook || !hook._modified) {
                    return;
                }

                prepareToRender = function () {
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
                };

                // Fire the event hook:render, any subscribers
                Y.publish(hookName + ':render', {
                    emitFacade: true,
                    defaultFn : prepareToRender
                });
                Y.fire(hookName + ':render', {
                    hook: hook,
                    debugData: hook.debugData
                });
            });

            if (Y.Object.isEmpty(hooksToRender)) {
                return done && done(Y.mix(self.hooks, self.hooks, true, hooks), mergedMeta);
            }

            Y.Object.each(hooksToRender, function (hook, hookName) {
                var command = {
                        instance: hook,
                        action: hook.action || 'index',
                        context: ac.context,
                        params: Y.merge(ac.params.params, hook.params)
                    },
                    adapter = new Y.mojito.debug.OutputHandler(hookName + '-hook', function (err, data, meta) {
                        var hook = self.hooks[hookName];

                        if (err) {
                            self.error(hookName, {
                                message: 'Rendering failed on ' + (isBrowser ? 'client' : 'server') + '-side',
                                exception: err
                            }, 'error');
                        } else {
                            mergedMeta = Y.mojito.util.metaMerge(mergedMeta, meta);
                            hook.debugData._content = data;
                            hook._viewId = (meta.view && meta.view.id) || Y.guid();
                        }

                        hook._rendered = true;

                        if (--numHooksToRender === 0) {
                            return done && done(Y.mix({}, self.hooks, true, hooks), mergedMeta);
                        }
                    }, self.MojitoClient);

                Y.mix(adapter, ac._adapter);

                if (self.mode === 'json') {
                    ac.dispatcher.store.expandInstance(command.instance, ac.context, function (err, newInst) {
                        var controller = newInst && Y.mojito.controllers[newInst.controller],
                            debugData = ac.debug.hooks[hookName].debugData;
                        if (controller && (controller.json || (controller.prototype && controller.prototype.json))) {
                            // The controller has a json action, which is used to render the hook.
                            command.action = newInst.action = 'json';
                            command.instance = newInst;
                            ac._dispatch(command, adapter);
                        } else {
                            adapter.callback(null, debugData._content, {});
                        }
                    });
                } else {
                    ac._dispatch(command, adapter);
                }
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
                    _append: [],
                    _json: null
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
        } else {
            Y.Debug = {};
            Y.mix(Y.Debug, DebugAddon.prototype);
        }
    }
}, '0.0.1', {
    requires: [
        'event-custom',
        'mojito-composite-addon',
        'mojito-params-addon',
        'mojito-debug-output-handler',
        'mojito-util'
    ]
});

/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, regexp: true, browser: true, plusplus: true, forin: true */
/*global YUI */

YUI.add('mojito-debug-binder', function (Y, NAME) {
    'use strict';

    // Get access to the Mojito client.
    var MojitoClient = {},
        mojitoClientConstructor = Y.mojito.Client;

    Y.mojito.Client = function (config) {
        var binderMap = {};
        Y.mix(MojitoClient, mojitoClientConstructor.prototype);
        // Make sure the debug binder is called first.
        Y.Object.some(config.binderMap, function (binder, viewId) {
            if (binder.name === NAME) {
                binderMap[viewId] = binder;
                return true;
            }
        });
        Y.mix(binderMap, config.binderMap);
        config.binderMap = binderMap;
        return mojitoClientConstructor.call(MojitoClient, config);
    };

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            this.debuggerNode = Y.one('#debugger');
            this.applicationNode = Y.one('#application');

            this._hookMojitProxy();
            this.mojitProxy = mojitProxy;
            this.initDebugger(mojitProxy);
            this.initHistory();
        },

        bind: function (node) {
            var self = this;

            self.node = node;

            self._addWindowTiming();

            self.app = new Y.mojito.debug.Application(self.applicationNode, self.debuggerNode, self.flushes, self.config.options['simulate-flushing'], function () {
                var getElementById = window.document.getElementById,
                    debuggerDocument = window.document,
                    appDocument = self.app.window.document;
                window.document.getElementById = function (id) {
                    return getElementById.call(appDocument, id) || getElementById.call(debuggerDocument, id);
                };

                // Make sure that tunnel events by the application are handled by the debugger controller on the server.
                if (self.app.window.YMojito) {
                    self._hookRpc(self.app.window.YMojito.client);
                }
            });
            if (self.mode === 'hide') {
                self.debuggerNode.setStyle('display', 'block');
            }

            delete self.mojitProxy.data;
        },

        _hookMojitProxy: function () {
            var self = this,
                OriginalMojitProxy = Y.mojito.MojitProxy;
            Y.mojito.MojitProxy = function (config) {
                var mojitProxy = new OriginalMojitProxy(config);
                // Check if this binder belongs to a hook
                Y.Object.each(self.hooks, function (hook, hookName) {
                    if (hook._viewId === config.viewId) {
                        hook.mojitProxy = mojitProxy;
                        hook.node = mojitProxy._node;
                        hook.binder = mojitProxy._binder;
                    }
                });
                return mojitProxy;
            };
        },

        _hookRpc: function (client) {
            var self = this,
                originalRpc = MojitoClient.dispatcher.rpc,
                debuggerProxy = self.mojitProxy;

            client.dispatcher.rpc = function (command, adapter) {
                var params,
                    url = {},
                    invokeOptions;

                if (command.instance.instanceId === debuggerProxy._instanceId) {
                    return originalRpc.call(MojitoClient.dispatcher, command, adapter);
                }

                if (this.tunnel) {
                    command.rpc = false;

                    Y.log('Dispatching instance "' + (command.instance.base || '@' +
                        command.instance.type) + '" through RPC tunnel.', 'info', NAME);

                    params = window.location.search.substring(1).split('&');
                    Y.Array.each(params, function (param) {
                        var parts = param.split('=');
                        url[parts[0]] = parts[1];
                    });

                    debuggerProxy.invoke('invoke', {
                        params: {
                            url: url,
                            body: {
                                hooks: Y.mojito.debug.Utils.decycle(self._getHooks()),
                                config: self.config,
                                command: command
                            }
                        },
                        rpc: true
                    }, function (error, result, meta) {
                        if (error) {
                            return adapter.error(error);
                        }
                        self._updateHooks(Y.mojito.debug.Utils.retrocycle(result.hooks));
                        adapter.callback(error, result.data, result.meta);

                        Y.Debug.render();
                    });
                } else {
                    adapter.error(new Error('RPC tunnel is not available in the [' +
                        command.context.runtime + '] runtime.'));
                }
            }.bind(MojitoClient.dispatcher);
        },

        _getHooks: function () {
            var self = this,
                hooks = {};
            Y.Object.each(self.hooks, function (hook, hookName) {
                hooks[hookName] = {};
                Y.mix(hooks[hookName], hook, false, ['config', 'debugData']);
            });
            return hooks;
        },

        _updateHooks: function (updatedHooks) {
            var hooks = this.hooks;
            Y.Object.each(updatedHooks, function (updatedHook, hookName) {
                Y.mix(hooks[hookName], updatedHook, true);
            });
        },

        _hookIntoMojitProxy: function (Y) {
            var self = this,
                MojitProxy = Y.use('mojito-mojit-proxy').mojito.MojitProxy,
                originalInvoke = MojitProxy.prototype.invoke;
            MojitProxy.prototype.invoke = function (action, options, callback) {
                var proxy = this,
                    url = {},
                    params,
                    invokeOptions;

                proxy._store.expandInstance({
                    base: proxy._base,
                    type: proxy.type
                }, proxy.context, function (err, instance) {
                    if (err || !instance || !instance.controller) {
                        params = window.location.search.substring(1).split('&');
                        Y.Array.each(params, function (param) {
                            var parts = param.split('=');
                            url[parts[0]] = parts[1];
                        });

                        invokeOptions = {
                            params: {
                                url: url,
                                body: {
                                    hooks: self.hooks,
                                    config: self.config,
                                    proxy: {
                                        _base: proxy._base,
                                        type: proxy.type,
                                        config: Y.mojito.util.copy(proxy.config),
                                        instanceId: proxy.instanceId
                                    },
                                    action: action,
                                    options: options
                                }
                            },
                            rpc: true
                        };

                        originalInvoke.call(self.mojitProxy, 'invoke', invokeOptions, function (error, data, meta) {
                            Y.mix(self.hooks, data.hooks, true);
                            callback(error, data.proxy);
                            Y.Debug.render(function () {
                                self.updateDebugger();
                            });
                        });
                    } else {
                        return originalInvoke.call(proxy, action, options, callback);
                    }

                });
            };
        },

        _addWindowTiming: function () {
            if (!window.performance) {
                Y.Debug.timing.server.latency = 0;
                return;
            }

            var self = this,
                debuggerTiming = window.performance.timing,
                totalResponseTime = debuggerTiming.responseEnd - debuggerTiming.requestStart, // ms
                totalServerTime = (Y.Debug.timing.server.debugEnd - Y.Debug.timing.server.debugStart), // ms
                latency = self.config.options['estimate-latency'] ? (totalResponseTime - totalServerTime) / 2 : 0; // ms

            Y.Debug.timing.server.latency = latency;

            if (!self.config.options['waterfall-window-performance']) {
                return;
            }

            Y.Debug.on('waterfall', function (debugData, hook) {
                var serverWaterfall = debugData.waterfall,
                    clientWaterfall = {
                        events: []
                    },
                    startTime,
                    endTime,
                    camelCaseToSentence = function (str) {
                        var sentence = '',
                            i;
                        for (i in str) {
                            sentence += (str.charCodeAt(i) < 90 ? ' ' : '') + str.charAt(i);
                        }
                        return String.fromCharCode(sentence.charCodeAt(0) - ('a'.charCodeAt(0) - 'A'.charCodeAt(0)))
                            + sentence.substring(1);
                    },
                    clientFirstFlushTime = Y.Debug.timing.client.firstFlush + debuggerTiming.navigationStart, // ms
                    clientLastFlushTime = Y.Debug.timing.client.lastFlush + debuggerTiming.navigationStart, // ms
                    serverFirstFlushTime = Y.Debug.timing.server.firstFlush, // ms
                    serverLastFlushTime = Y.Debug.timing.server.lastFlush, // ms
                    serverStartTime = Y.Debug.timing.server.debugStart, // ms
                    clientRequestStart = debuggerTiming.requestStart, // ms
                    // Time before the first flush should be shifted such that the client's request start matches the server's debug start time - estimated latency.
                    beforeFirstFlushShift = -1 * clientRequestStart + serverStartTime - latency,
                    // Time at and after the last flush should be shifted such that the client's response end matches the server's last flush + the estimated latency.
                    afterLastFlushShift = -1 * debuggerTiming.responseEnd + serverFirstFlushTime + latency,
                    events = ['navigationStart', 'unloadEventStart', 'unloadEventEnd', 'redirectStart',
                              'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd',
                              'connectStart', 'connectEnd', 'secureConnectionStart', 'requestStart',
                              'responseStart', 'responseEnd', 'domLoading', 'domInteractive',
                              'domContentLoadedEventStart', 'domContentLoadedEventEnd', 'domComplete',
                              'loadEventStart', 'loadEventEnd'];

                Y.Array.each(events, function (name) {
                    var time,
                        shift = 0;

                    if (debuggerTiming[name] <= debuggerTiming.requestStart) {
                        time = debuggerTiming[name];
                        shift = beforeFirstFlushShift;
                    } else if (name === 'responseStart') {
                        time = serverFirstFlushTime + latency;
                    } else if (name === 'responseEnd') {
                        time = serverLastFlushTime + latency;
                    } else {
                        time = debuggerTiming[name];
                        shift = afterLastFlushShift;
                    }

                    if (time) {
                        time += shift;
                        clientWaterfall.events.push({
                            name: camelCaseToSentence(name),
                            time: time,
                            'class': 'Window Performance'
                        });
                    }
                });

                debugData.waterfall = Y.mojito.Waterfall.merge(serverWaterfall, clientWaterfall, (-1 * serverWaterfall.absoluteStartTime) + 'ns');

                hook.params = {
                    body: {
                        waterfall: debugData.waterfall
                    }
                };

                Y.Debug.render('waterfall');
            });
        },

        initHistory: function () {
            var self = this,
                initialState = {
                    hooks: self.urlHooks,
                    mode: self.mode
                };

            self.history = new Y.History({
                initialState: initialState
            });

            self.history.on('change', function (e) {
                if (Y.Object.isEmpty(e.newVal)) {
                    e.newVal = initialState;
                    e.halt(true);
                    return;
                }
            });

            self.history.after('change', function (e) {
                var urlHooks = e.newVal.hooks,
                    currentHooks = [],
                    mode = e.newVal.mode,
                    reload,
                    hooks = self.hooks;

                if (e.src !== 'popstate') {
                    return;
                }

                // Determine all the hooks associated with the urlHooks
                Y.Array.each(urlHooks, function (urlHook) {
                    Array.prototype.push.apply(currentHooks, self.config.aliases[urlHook] || [urlHook]);
                });

                self.changeMode(mode);

                // Reload the page if any hookContainer to be displayed is missing
                reload = Y.some(currentHooks, function (hook) {
                    if (!hooks[hook]) {
                        return true;
                    }
                });

                if (reload) {
                    window.location.reload();
                    return;
                }

                // Place hooks in their proper order.
                Y.Array.each(currentHooks, function (hook) {
                    var hookContainer = self.hooks[hook].hookContainer;
                    hookContainer.ancestor().append(hookContainer);
                });

                Y.Object.each(hooks, function (hook, hookName) {
                    if (currentHooks.indexOf(hookName) === -1) {
                        hook.hookContainer.close();
                    } else {
                        hook.hookContainer.open();
                    }
                });
            });

            if (/(\?|&)debug(\.[^&=]+)?=?($|&)/.test(window.location.href)) {
                this.history.replaceValue('hooks', ['all'], {
                    url: window.location.href.replace(/(\?|&)(debug(?:\.[^&=]+)?)(=)?($|&)/, '$1$2=all$4')
                });
            }
        },

        initDebugger: function (mojitProxy) {
            var self = this,
                command = {
                    context: mojitProxy.context,
                    instance: {
                        controller: 'debug-controller',
                        base: mojitProxy._base,
                        type: mojitProxy.type,
                        instanceId: mojitProxy._instanceId,
                        config: Y.mojito.util.copy(mojitProxy.config),
                        data: mojitProxy.data
                    },
                    params: {
                        url: this.getUrlParams(window.location.search.substring(1))
                    }
                },
                adapter = new Y.mojito.OutputHandler(mojitProxy._viewId, function () {}, MojitoClient),
                ac = {
                    dispatcher: MojitoClient.dispatcher
                };

            ac._dispatch = function (command, adapter) {
                return ac.dispatcher.dispatch(command, adapter);
            };

            Y.Array.each(['params', 'assets'], function (addon) {
                ac[addon] = new Y.mojito.addons.ac[addon](command, adapter, ac);
            });

            // Allow client side YUI modules to use the debug addon through Y.Debug
            Y.Debug = window.top.DEBUGGER = new Y.mojito.addons.ac.debug(command, adapter, ac);
            Y.Debug.binder = self;
            Y.Debug.Y = Y;
            Y.Debug.MojitoClient = MojitoClient;

            // Make sure that tunnel events by the debugger are handled by the debugger controller on the server.
            self._hookRpc(MojitoClient);

            // Make render method public only on client side.
            Y.Debug.render = function (hooks) {
                Y.Debug._render(hooks, function (renderedHooks, meta) {
                    self.updateDebugger();
                    if (meta.binders) {
                        MojitoClient.attachBinders(meta.binders);
                    }
                });
            };

            this.hooks    = Y.Debug.hooks    = Y.mojito.debug.Utils.retrocycle(mojitProxy.data.get('hooks'));
            this.mode     = Y.Debug.mode     = mojitProxy.data.get('mode');
            this.urlHooks = Y.Debug.urlHooks = mojitProxy.data.get('urlHooks');
            this.config   = Y.Debug.config   = mojitProxy.data.get('config');
            this.flushes  = Y.Debug.flushes  = mojitProxy.data.get('flushes');
            this.timing   = Y.Debug.timing   = mojitProxy.data.get('timing');
            Y.Debug.binder = this;

            mojitProxy.config = this.config;

            this.updateDebugger();
        },

        updateDebugger: function () {
            var self = this,
                hooks = self.hooks;

            Y.Object.each(hooks, function (hook, hookName) {
                if (!hook._rendered) {
                    return;
                }
                if (!hook.hookContainer) {
                    hook.hookContainer = new Y.mojito.debug.HookContainer(hookName, hook);
                    self.debuggerNode.append(hook.hookContainer);
                } else {
                    hook.hookContainer.update(hook);
                }
                hook._rendered = false;
            });
        },

        changeMode: function (mode) {
            if (this.mode === mode) {
                return;
            }

            var updateUrl = this.history.get('mode') !== mode,
                newUrl = updateUrl || mode === 'json' ? this.changeUrlMode(window.location.href, mode) : null;

            if (mode === 'hide') {
                this.app.close(true);
            } else if (!mode && this.mode === 'hide') {
                this.app.open(true);
            } else if (mode === 'json') {
                location.href = newUrl;
                return;
            }

            if (updateUrl) {
                this.history.add({
                    hooks: this.history.get('hooks').slice(0),
                    mode: mode
                }, {
                    url: newUrl
                });
            }

            this.mode = mode;
        },

        changeUrlMode: function (url, mode) {
            return url.replace(/(\?|&)(debug)(\.(json|hide))?/, '$1debug' + (mode ? '.' + mode : ''));
        },

        addHook: function (hook, anim) {
            return this._changeHook(hook, 'add', anim);
        },

        removeHook: function (hook, anim) {
            return this._changeHook(hook, 'remove', anim);
        },

        _changeHook: function (hook, action, anim) {
            var self = this,
                urlHooks = self.history.get('hooks'),
                currentHooks = [],
                newHooks = [],
                addHook = (action === 'add'),
                hookIsPresent,
                newUrl,
                reload;

            // Determine all the hooks associated with the urlHooks
            Y.Array.each(urlHooks, function (urlHook) {
                Array.prototype.push.apply(currentHooks, self.config.aliases[urlHook] || [urlHook]);
            });
            hookIsPresent = currentHooks.indexOf(hook) !== -1 || urlHooks.indexOf(hook) !== -1;

            if ((addHook && hookIsPresent) || (!addHook && !hookIsPresent)) {
                return;
            }

            newUrl = this._changeUrlHook(location.href, hook, action);

            Y.Array.each(newUrl.hooks, function (urlHook) {
                Array.prototype.push.apply(newHooks, self.config.aliases[urlHook] || [urlHook]);
            });

            if (addHook) {
                // Make sure all required hooks are present.
                // Else the page must be refreshed.

                reload = Y.some(newHooks, function (hook) {
                    if (!self.hooks[hook]) {
                        return true;
                    }
                });
                if (reload) {
                    location.href = newUrl.url;
                    return;
                }

                // Move hook containers to the end and open if necessary
                Y.Array.each(newHooks, function (urlHook) {
                    Y.Array.each(self.config.aliases[urlHook] || [urlHook], function (hook) {
                        if (currentHooks.indexOf(hook) === -1) {
                            var hookContainer = self.hooks[hook].hookContainer;
                            hookContainer.ancestor().append(hookContainer);
                            hookContainer.open(anim);
                        }
                    });
                });
            } else {
                // Close hook containers if necessary.
                Y.Array.each(currentHooks, function (hook) {
                    if (newHooks.indexOf(hook) === -1) {
                        var hookContainer = self.hooks[hook].hookContainer;
                        hookContainer.close(anim);
                    }
                });
            }

            this.history.add({
                hooks: newUrl.hooks,
                mode: this.history.get('mode')
            }, {
                url: newUrl.url
            });

            return newUrl;
        },

        addUrlHook: function (url, hook) {
            return this._changeHookInUrl(url, hook, 'add');
        },

        removeUrlHook: function (url, hook) {
            return this._changeHookInUrl(url, hook, 'remove');
        },

        _changeUrlHook: function (url, hook, action) {
            var self = this,
                match = url.match(/(\?|&)debug(\.(json|hide))?(=[^&]*)?/),
                addHook = action === 'add',
                debugParam = match && match[0],
                debugParamParts,
                urlHooks,
                urlHook,
                index,
                i = 0,
                j = 0,
                aliases = self.config.aliases,
                aliasHook,
                aliasHooks,
                newDebugParam;

            if (!debugParam) {
                return;
            }

            debugParamParts = debugParam.split('=');

            urlHooks = debugParamParts[1] ? debugParamParts[1].split(',') : [];

            if (!addHook) {
                // Expand any alias that contains this hook
                while (i < urlHooks.length) {
                    aliasHooks = aliases[urlHooks[i]];
                    if (aliasHooks && aliasHooks.indexOf(hook) !== -1) {
                        aliasHook = urlHooks.splice(i, 1)[0];
                        for (j = 0; j < aliases[aliasHook].length; j++) {
                            urlHook = aliases[aliasHook][j];
                            if (urlHooks.indexOf(urlHook) === -1) {
                                urlHooks.splice(i, 0, urlHook);
                                i++;
                            }
                        }
                    } else {
                        i++;
                    }
                }

                // Remove hook
                index = urlHooks.indexOf(hook);
                if (index !== -1) {
                    urlHooks.splice(index, 1);
                }
            } else {
                // Remove any associated hooks if this hook is an alias.
                Y.Array.each(aliases[hook], function (hook) {
                    var index = urlHooks.indexOf(hook);
                    if (index !== -1) {
                        urlHooks.splice(index, 1);
                    }
                });
                urlHooks.push(hook);
            }

            newDebugParam = debugParamParts[0] + '=' + urlHooks.join(',');

            return {
                url: url.replace(debugParam, newDebugParam),
                hooks: urlHooks
            };
        },

        getUrlParams: function (query) {
            if (!query) {
                return {};
            }
            var paramArray = query.split('&'),
                paramMap = {};
            Y.Array.each(paramArray, function (param) {
                var parts = param.split('=');
                paramMap[parts[0]] = parts[1];
            });
            return paramMap;
        }
    };

}, '0.0.1', {
    requires: [
        'history',
        'anim',
        'mojito-debug-utils',
        'mojito-debug-addon',
        'mojito-debug-application',
        'mojito-waterfall',
        'mojito-action-context',
        'mojito-client',
        'mojito-output-handler',
        'mojito-debug-hook-container',
        'mojito-util'
    ]
});

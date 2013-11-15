/*jslint nomen: true, regexp: true, browser: true, plusplus: true */
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
            this.mojitProxy = mojitProxy;
            this.initDebugger(mojitProxy);
            this.initHistory();
        },

        bind: function (node) {
            var self = this;
            self.app = new Y.mojito.debug.Application(node.one('#app'), this.mojitProxy.data.get('app'));
            self.app.init(function () {
                self.debuggerNode.setStyle('display', 'block');
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
                    hookContainers = self.hookContainers;

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
                    if (!hookContainers[hook]) {
                        return true;
                    }
                });

                if (reload) {
                    window.location.reload();
                    return;
                }

                // Place hooks in their proper order.
                Y.Array.each(currentHooks, function (hook) {
                    var hookContainer = hookContainers[hook];
                    hookContainer.ancestor().append(hookContainer);
                });

                Y.Object.each(hookContainers, function (hookContainer, hook) {
                    if (currentHooks.indexOf(hook) === -1) {
                        hookContainer.close();
                    } else {
                        hookContainer.open();
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
            var command = {
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
                ac = {};

            this.debuggerNode = Y.one('#debugger');

            Y.Array.each(['composite', 'params', 'assets'], function (addon) {
                ac[addon] = new Y.mojito.addons.ac[addon](command, adapter, ac);
            });

            // Allow client side YUI modules to use the debug addon through Y.Debug
            Y.Debug = window.top.DEBUGGER = new Y.mojito.addons.ac.debug(command, adapter, ac);
            Y.Debug.binder = this;

            this.mode = mojitProxy.data.get('mode');
            this.hooks = mojitProxy.data.get('hooks');
            this.urlHooks = mojitProxy.data.get('urlHooks');
            this.config = mojitProxy.data.get('config');
            this.hookContainers = {};

            this.updateDebugger();
        },

        updateDebugger: function () {
            var self = this,
                hookContainers = self.hookContainers,
                hooks = self.hooks;

            Y.Object.each(hooks, function (hook, hookName) {
                if (!hook.needsUpdate) {
                    return;
                }

                if (!hookContainers[hookName]) {
                    hookContainers[hookName] = new Y.mojito.debug.HookContainer(hookName, hook);
                    self.debuggerNode.append(hookContainers[hookName]);
                } else {
                    hookContainers[hookName].updateContent(hook);
                }
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

            if (addHook) {
                // Make sure all required hooks are present.
                // Else the page must be refreshed.
                Y.Array.each(newUrl.hooks, function (urlHook) {
                    Array.prototype.push.apply(newHooks, self.config.aliases[urlHook] || [urlHook]);
                });

                reload = Y.some(newHooks, function (hook) {
                    if (!self.hookContainers[hook]) {
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
                            var hookContainer = self.hookContainers[hook];
                            hookContainer.ancestor().append(hookContainer);
                            hookContainer.open(anim);
                        }
                    });
                });
            } else {
                // Close hook containers if necessary.
                Y.Array.each(currentHooks, function (hook) {
                    if (newUrl.hooks.indexOf(hook) === -1) {
                        var hookContainer = self.hookContainers[hook];
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
            var paramArray = (query || '').split(),
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
        'mojito-debug-addon',
        'mojito-debug-application',
        'mojito-action-context',
        'mojito-client',
        'mojito-output-buffer',
        'mojito-debug-hook-container'
    ]
});

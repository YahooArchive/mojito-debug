/*jslint nomen: true, regexp: true, browser: true */
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
            var self = this;
            window.H = self.history = new Y.History({
                initialState: {
                    hooks: Object.keys(Y.Debug.hooks),
                    mode: Y.Debug.mode
                }
            });

            self.history.once('change', function (e) {
                if (Y.Object.isEmpty(e.newVal)) {
                    e.newVal = e.prevVal;
                    e.halt(true);
                    return;
                }
            });

            self.history.after('change', function (e) {
                var hooks = e.newVal.hooks,
                    mode = e.newVal.mode,
                    hookContainers = Y.Debug.hookContainers;

                if (e.src !== 'popstate') {
                    return;
                }

                self.changeMode(mode);

                // Reload the page if any hookContainer to be displayed is missing
                Y.some(hooks, function (hook) {
                    if (!hookContainers[hook]) {
                        window.location.reload();
                        hooks = [];
                        return true;
                    }
                });

                Y.Array.each(hooks, function (hook) {
                    var hookContainer = hookContainers[hook];
                    hookContainer.ancestor().append(hookContainer);
                });

                Y.Object.each(hookContainers, function (hookContainer, hook) {
                    if (hooks.indexOf(hook) === -1) {
                        hookContainer.close();
                    } else {
                        hookContainer.open();
                    }
                });
            });

            if (/(\?|&)debug(\.[^&=]+)?=?($|&)/.test(window.location.href)) {
                this.history.replaceValue('hooks', ['help'], {
                    url: window.location.href.replace(/(\?|&)(debug(?:\.[^&=]+)?)(=)?($|&)/, '$1$2=help$4')
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
            Y.Debug.mode = mojitProxy.data.get('mode');
            Y.Debug.hooks = mojitProxy.data.get('hooks');
            Y.Debug.hookContainers = {};
            Y.Debug.binder = this;

            this.updateDebugger();
        },

        updateDebugger: function () {
            var self = this,
                hookContainers = Y.Debug.hookContainers,
                hooks = Y.Debug.hooks;

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
            if (Y.Debug.mode === mode) {
                return;
            }

            var updateUrl = this.history.get('mode') !== mode,
                newUrl = updateUrl || mode === 'json' ? this.changeUrlMode(window.location.href, mode) : null;

            if (mode === 'hide') {
                this.app.close(true);
            } else if (!mode && Y.Debug.mode === 'hide') {
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

            Y.Debug.mode = mode;
        },

        changeUrlMode: function (url, mode) {
            return url.replace(/(\?|&)(debug)(\.(json|hide))?/, '$1debug' + (mode ? '.' + mode : ''));
        },

        addHook: function (hook) {
            this._changeHook(hook, true);
        },

        removeHook: function (hook) {
            this._changeHook(hook, false);
        },

        _changeHook: function (hook, addHook) {
            var hooks = this.history.get('hooks'),
                hookContainer = Y.Debug.hookContainers[hook],
                hookIsPresent = hooks.indexOf(hook) !== -1,
                newUrl;

            if ((addHook && hookIsPresent) || (!addHook && !hookIsPresent)) {
                return;
            }

            newUrl = this._changeUrlHook(location.href, hook, addHook);

            if (addHook && !hookContainer) {
                location.href = newUrl;
                return;
            }

            hooks = hooks.slice(0);
            if (addHook) {
                hooks.push(hook);
                // Move container to the end.
                hookContainer.ancestor().append(hookContainer);
            } else {
                hooks.splice(hooks.indexOf(hook), 1);
            }

            this.history.add({
                hooks: hooks,
                mode: this.history.get('mode')
            }, {
                url: newUrl
            });
        },

        addUrlHook: function (url, hook) {
            this._changeHookInUrl(url, hook, true);
        },

        removeUrlHook: function (url, hook) {
            this._changeHookInUrl(url, hook, false);
        },

        _changeUrlHook: function (url, hook, add) {
            var match = url.match(/(\?|&)debug(\.(json|hide))?(=[^&]*)?/),
                debugParam = match && match[0],
                debugParamParts,
                hooks,
                newDebugParam;

            if (!debugParam) {
                return;
            }

            debugParamParts = debugParam.split('=');

            hooks = debugParamParts[1] ? debugParamParts[1].split(',') : [];

            if (!add) {
                hooks.splice(hooks.indexOf(hook), 1);
            } else {
                hooks.push(hook);
            }

            newDebugParam = debugParamParts[0] + '=' + hooks.join(',');

            return url.replace(debugParam, newDebugParam);
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

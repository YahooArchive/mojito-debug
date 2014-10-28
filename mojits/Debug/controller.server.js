/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */
/*global YUI */

YUI.add('mojito-debug-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            var self = this,
                start,
                req = ac.http.getRequest();

            if (req.url === req.globals['mojito-debug'].originalUrl) {
                self.runDebugger(ac, function (err, data, meta) {
                    ac.done(data, meta);
                });
                return;
            }

            // Remove the /debug route which was added by the debugger middleware.
            req.url = req.globals['mojito-debug'].originalUrl;

            ac.debug.timing.server.debugStart = req.globals['mojito-debug'].debugStart[0] * 1e3 + req.globals['mojito-debug'].debugStart[1] / 1e6;

            ac.debug.fire('application:start');
            self.runApplication(ac, function (err, flushes) {

                ac.debug.fire('application:end');

                ac.debug.flushes = flushes;
                self.runDebugger(ac, function (err, data, meta) {
                    ac.done(data, meta);
                });
            });
        },

        runApplication: function (ac, callback) {
            var self = this,
                req = ac.http.getRequest(),
                res = ac.http.getResponse(),
                resWrite = res.write,
                resEnd = res.end,
                resWriteHead = res.writeHead,
                flushes = [],
                firstFlushTime = null,
                flush = function (data, more) {
                    var time = self._getTime(ac);

                    if (!firstFlushTime) {
                        firstFlushTime = time;
                        ac.debug.timing.server.firstFlush = time;
                    }

                    flushes.push({
                        data: data,
                        time: (time - firstFlushTime) // ms
                    });

                    if (more) {
                        return;
                    }

                    // Last flush.
                    ac.debug.timing.server.lastFlush = time;

                    ac.debug.on('waterfall', function (debugData, hook) {
                        debugData.waterfall.event('Application End', {
                            group: 'Server'
                        });

                        // Remove the custom dispatcher.
                        delete req.dispatcher;

                        // Get waterfall gui object and make it available through debugData
                        debugData.waterfall = debugData.waterfall.getGui();

                        // Add the waterfall gui to waterfall's parameters since the Waterfall
                        // controller requires it.
                        hook.params = {
                            body: {
                                waterfall: debugData.waterfall
                            }
                        };
                    }.bind(self));

                    res.write = resWrite;

                    res.end = function (data) {
                        ac.debug.timing.server.debugEnd = self._getTime(ac);
                        // Replace the debugEnd placeholder now that we know the actual debugEnd time.
                        data = data.replace(/["']\{\{debugEnd\}\}["']/, ac.debug.timing.server.debugEnd);
                        resEnd.call(res, data);
                    };

                    res.writeHead = resWriteHead;

                    callback(null, flushes);
                };

            req.debugging = true;

            res.writeHead = function () {};

            res.write = function (data) {
                flush(data, true);
            };

            res.end = function (data) {
                ac.debug.timing.server.appEnd = self._getTime(ac);
                flush(data);
            };

            // Create a waterfall and use the waterfall custom dispatcher.
            ac.debug.on('waterfall', function (debugData) {
                var waterfall = new Y.mojito.Waterfall({
                        classes: {
                            'Window Performance': {
                                group: ['Client', 'Window Performance'],
                                color: 'purple'
                            }
                        },
                        stats: {
                            // Only show stats related to mojito internals.
                            profileFilter: 'level === "mojito"'
                        }
                    }),
                    dispatcher = Y.mix({}, Y.mojito.Waterfall.Dispatcher);

                debugData.waterfall = waterfall;

                dispatcher.init(ac.dispatcher.store, ac.dispatcher.tunnel, waterfall);
                req.dispatcher = dispatcher;

                ac.debug.timing.server.appStart = self._getTime(ac);

                debugData.waterfall.event('Application Start', {
                    group: 'Server'
                });
            });

            req.app.handle(req, res);
        },

        runDebugger: function (ac, done) {
            var command = {
                    context: ac.context
                },
                adapter = new Y.mojito.OutputBuffer('debugger', done);

            if (ac.debug.mode === 'json') {
                command.instance = {
                    type: 'Debug',
                    action: 'debugJson'
                };
            } else {
                command.instance = ac.config.get('debug-specs');
            }

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
        },

        debug: function (ac) {
            var self = this;
            // Render all hooks.
            ac.debug._render(function (hooks, hooksMeta) {

                // This serves as a placeholder for the actual debugEnd time,
                // which is determined when the full response is ended.
                // (See when the application is done running and res.end is
                // hooked in order to set the actual debugEnd time.)
                ac.debug.timing.server.debugEnd = '{{debugEnd}}';

                ac.data.set('flushes', ac.debug.flushes);
                ac.data.set('hooks', Y.mojito.debug.Utils.decycle(hooks));
                ac.data.set('urlHooks', ac.debug.urlHooks);
                ac.data.set('mode', ac.debug.mode);
                ac.data.set('config', ac.debug.config);
                ac.data.set('timing', ac.debug.timing);

                ac.done({
                    showApplication: !!ac.debug.flushes
                }, hooksMeta);

            });
        },

        debugJson: function (ac) {
            var hooks;

            ac.debug._render(function (hooks, hooksMeta) {
                var jsonHooks = {};

                Y.Object.each(hooks, function (hook, hookName) {
                    Y.Array.each(['errors', 'content', 'append', 'json'], function (attr) {
                        attr = '_' + attr;
                        if (!hook.debugData[attr] || hook.debugData[attr].length === 0) {
                            delete hook.debugData[attr];
                        }
                    });
                    hook.debugData = hook.debugData._json || hook.debugData._content || hook.debugData;
                    if (Y.Lang.isString(hook.debugData)) {
                        try {
                            hook.debugData = JSON.parse(hook.debugData);
                        } catch (e) {
                            ac.debug.error(hookName, {
                                message: 'Error parsing ' + hookName + ' JSON data.',
                                exception: e
                            }, 'error', NAME);
                        }
                    }
                    jsonHooks[hookName] = hook.debugData;
                });

                try {
                    jsonHooks = JSON.stringify(jsonHooks, null, '    ');
                } catch (e) {
                    jsonHooks = JSON.stringify(Y.mojito.debug.Utils.transformObject(jsonHooks, 7, true, false, false), null, '    ');
                }

                ac.done(jsonHooks, {
                    http: {
                        headers: {
                            'content-type': 'application/json; charset="utf-8"'
                        }
                    }
                });
            });
        },

        createAppInstance: function (ac) {
            var req = ac.http.getRequest(),
                appUrl = req.url.replace('/debug/', '/'),
                route = ac.url.find(appUrl),
                instance = {};

            if (!route) {
                return null;
            }

            if (route.call === '*.*') {
                route.call = [route.query.module, route.query.action];
            } else {
                route.call = route.call.split('.');
            }

            if (route.call[0].charAt(0) === '@') {
                instance.type = route.substring(1);
            } else {
                instance.base = route.call[0];
            }
            instance.action = route.call[1];

            return instance;
        },

        invoke: function (ac) {
            var body = ac.params.body(),
                url = ac.params.url(),
                hooks = Y.mojito.debug.Utils.retrocycle(body.hooks),
                command = body.command,
                adapter = new Y.mojito.OutputBuffer('proxy', function (error, data, meta) {
                    var headers = (meta && meta.http && meta.http.headers) || {},
                        dataIsJson = headers['content-type'] === 'application/json' ||
                            (headers['content-type'] || []).indexOf('application/json') !== -1;

                    if (dataIsJson && Y.Lang.isString(data)) {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            Y.log('Error parsing JSON string.', 'error', NAME);
                        }
                    }
                    ac.http.setHeader('Content-type', 'application/json');
                    ac.done(JSON.stringify({
                        error: error instanceof Error ? error.toString() : error,
                        data: data,
                        meta: meta,
                        hooks: Y.mojito.debug.Utils.decycle(ac.debug.hooks)
                    }), meta);
                });

            ac.debug.hooks = hooks;
            command.context = ac.context;

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
        },

        _getTime: function (ac) {
            var time = process.hrtime();
            return time[0] * 1e3 + time[1] / 1e6;
        }

    };
}, '0.0.1', {
    requires: [
        'mojito-debug-utils',
        'mojito-debug-addon',
        'mojito-composite-addon',
        'mojito-config-addon',
        'mojito-data-addon',
        'mojito-util',
        'mojito-url-addon',
        'mojito-params-addon',
        'mojito-http-addon',
        'mojito-waterfall',
        'mojito-waterfall-dispatcher'
    ]
});

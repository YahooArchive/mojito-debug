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
            var self = this;

            self.runApplication(ac, function (err, appHtml) {
                ac.debug.appHtml = appHtml;
                self.runDebugger(ac, function (err, data, meta) {
                    ac.done(data, meta);
                });
            });
        },

        runApplication: function (ac, callback) {
            var command = {
                    instance: this.createAppInstance(ac),
                    context: ac.context,
                    params: ac.params.params
                },
                adapter = {
                    data: '',
                    done: function (data) {
                        this.data += data;
                        callback(null, this.data);
                    },
                    flush: function (data) {
                        this.data += data;
                    },
                    error: function (err) {
                        callback(err);
                    }
                };

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
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
            // Render all hooks.
            ac.debug._render(function (hooks, hooksMeta) {
                ac.data.set('app', ac.debug.appHtml);
                ac.data.set('hooks', ac.debug._decycleHooks(hooks));
                ac.data.set('urlHooks', ac.debug.urlHooks);
                ac.data.set('mode', ac.debug.mode);
                ac.data.set('config', ac.debug.config);

                ac.done({}, hooksMeta);
            });
        },

        debugJson: function (ac) {
            ac.done(JSON.stringify(ac.debug._decycleHooks(ac.debug.hooks), null, '    '), {
                http: {
                    headers: {
                        'content-type': 'application/json; charset="utf-8"'
                    }
                }
            });
        },

        createAppInstance: function (ac) {
            var appUrl = ac._adapter.req.url.replace('/debug/', '/'),
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
                hooks = body.hooks,
                command = body.command,
                adapter = new Y.mojito.OutputBuffer('proxy', function (err, data, meta) {
                    ac.http.setHeader('Content-type', 'application/json');
                    ac.done(JSON.stringify({
                        data: data,
                        meta: meta,
                        hooks: Y.mojito.debug.Utils.removeCycles(ac.debug.hooks)
                    }), meta);
                });

            ac.debug.hooks = hooks;

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
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
        'mojito-http-addon'
    ]
});

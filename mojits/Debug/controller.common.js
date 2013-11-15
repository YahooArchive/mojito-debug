/*jslint nomen: true */
YUI.add('mojito-debug-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            var self = this;

            self.runApplication(ac, function (err, appHtml, appMeta) {
                ac.debug.appHtml = appHtml;
                self.runDebugger(ac, function (err, data, meta) {
                    ac.done(data, meta);
                });
            });
        },

        runApplication: function (ac, done) {
            var command = {
                    instance: this.createAppInstance(ac),
                    context: ac.context
                },
                adapter = new Y.mojito.OutputBuffer('application', done);

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
                command.instance = {
                    type: 'HTMLFrameMojit',
                    config: {
                        deploy: true,
                        child: {
                            type: 'Debug',
                            action: 'debug'
                        },
                        assets: {
                            top: {
                                css: [
                                    '/static/Debug/assets/debug.css',
                                    '/static/Debug/assets/hook-container.css',
                                    '/static/JSONTree/assets/css/json-tree.css'
                                ]
                            }
                        }
                    }
                };
            }

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
        },

        debug: function (ac) {
            ac.debug._render(function (hooks, hooksMeta) {

                ac.data.set('app', ac.debug.appHtml);
                ac.data.set('hooks', hooks);
                ac.data.set('urlHooks', ac.debug.urlHooks);
                ac.data.set('mode', ac.debug.mode);
                ac.data.set('config', ac.debug.config);

                ac.done({}, hooksMeta);
            });
        },

        debugJson: function (ac) {
            ac.done(JSON.stringify(ac.debug.hooks, null, '    '), {
                http: {
                    headers: {
                        'content-type': 'application/json; charset="utf-8"'
                    }
                }
            });
        },

        createAppInstance: function (ac) {
            var appUrl = ac._adapter.req.url.replace('/debug', '/'),
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
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'mojito-composite-addon',
        'mojito-data-addon',
        'mojito-util',
        'mojito-url-addon'
    ]
});

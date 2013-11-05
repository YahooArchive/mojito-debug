/*jslint nomen: true */
YUI.add('mojito-debug-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            var command = {
                    context: ac.context,
                    instance: {
                        type: 'HTMLFrameMojit',
                        config: {
                            deploy: true,
                            child: {
                                type: 'Debug',
                                action: 'debug'
                            }
                        }
                    }
                },
                adapter = new Y.mojito.OutputBuffer('htmlframe', function (err, data, meta) {
                    ac.done(data, meta);
                });

            Y.mix(adapter, ac._adapter);
            ac._dispatch(command, adapter);
        },

        debug: function (ac) {
            var command = {
                    instance: this.createAppInstance(ac),
                    context: ac.context
                },
                adapter = new Y.mojito.OutputBuffer('application', function (err, appHtml, appMeta) {
                    ac.debug._render(function (hooks, hooksMeta) {

                        ac.data.set('app', appHtml);
                        ac.data.set('hooks', hooks);

                        ac.done({}, hooksMeta);
                    });
                });


            /*if (!command.instance) {
                // set error
            }*/

            Y.mix(adapter, ac._adapter);

            ac._dispatch(command, adapter);
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

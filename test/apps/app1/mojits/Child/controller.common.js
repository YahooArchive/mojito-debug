/*jslint plusplus: true */
YUI.add('child-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            ac.debug.on('waterfall', function (debugData) {
                debugData.waterfall.event('Child Controller Start', {
                    group: 'Child'
                });
            });
            var info = Y.Test.log(ac.debug, NAME + ' index executed.'),
                version;

            ac.debug.on('simple-hook', function (debugData) {
                if (!debugData.version) {
                    debugData.version = 0;
                }
                version = ++debugData.version;
            });


            ac.debug.setContent('simple-hook', {
                json: {
                    "version": version,
                    "simple-hook": {
                        created: info.time,
                        location: info.location
                    }
                },
                options: {
                    text: true
                }
            });

            ac.done({
                time: info.time
            });
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'test-log'
    ]
});

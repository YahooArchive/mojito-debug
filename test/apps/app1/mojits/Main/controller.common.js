/*jslint plusplus: true */
YUI.add('main-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            ac.debug.on('waterfall', function (debugData) {
                debugData.waterfall.event('Main Controller Start', {
                    group: 'Main'
                });
            });
            var info = Y.Test.log(ac.debug, NAME + ' index executed.');

            ac.assets.addCss('./index.css');

            ac.debug.on('mojit-hook', function (debugData) {
                if (!debugData.version) {
                    debugData.version = 0;
                }
                debugData.version++;
            });


            ac.composite.execute({
                children: {
                    child: {
                        type: "Child"
                    }
                }
            }, function (data, meta) {
                data.time = info.time;
                data.location = info.location;
                ac.done(data, meta);
            });
        },

        page1: function (ac) {
            var info = Y.Test.log(ac.debug, NAME + ' page1 executed.');
            ac.done();
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'mojito-composite-addon',
        'mojito-assets-addon',
        'test-log'
    ]
});

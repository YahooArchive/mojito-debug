YUI.add('mojit-hook-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            var info = Y.Test.log(ac.debug, NAME + ' index executed.');
            ac.assets.addCss('./index.css');
            ac.done({
                time: info.time,
                location: info.location,
                version: ac.params.getFromBody('debugData').version
            });
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'test-log'
    ]
});

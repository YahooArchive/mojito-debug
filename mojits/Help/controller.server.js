YUI.add('help-hook-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            ac.assets.addCss('./index.css');
            ac.done();
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-data-addon'
    ]
});
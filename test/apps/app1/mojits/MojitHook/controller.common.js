YUI.add('mojit-hook-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            ac.assets.addCss('./index.css');
            ac.done({
                hook: ac.params.getFromBody('debugData').hook
            });
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-assets-addon',
        'mojito-params-addon'
    ]
});

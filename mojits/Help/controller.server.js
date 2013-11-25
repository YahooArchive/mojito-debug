/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*global YUI */

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

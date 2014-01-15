/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*globals YUI  */

YUI.add('mojito-debug-json-tree-controller', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            ac.data.set('json', ac.params.getFromBody('json'));
            ac.data.set('options', ac.params.getFromBody('options'));
            ac.done();
        }
    };

}, '0.0.1', {
    requires: [
        'mojito-params-addon',
        'mojito-data-addon'
    ]
});

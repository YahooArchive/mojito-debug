/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*globals YUI */

YUI.add('mojito-debug-output-handler', function (Y, NAME) {
    'use strict';
    Y.namespace('mojito.debug').OutputHandler = Y.mojito.OutputHandler;
}, '0.0.1', {
    requires: [
        'mojito-output-handler'
    ]
});
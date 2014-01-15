/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*globals YUI  */

YUI.add('mojito-debug-json-tree', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {

        "init": function (mojitProxy) {
            this.mojitProxy = mojitProxy;
        },

        "bind": function (node) {
            var jsonTree = new Y.mojito.debug.JSONTree(this.mojitProxy.data.get('json'), this.mojitProxy.data.get('options'));
            node.append(jsonTree);
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-json-tree'
    ]
});

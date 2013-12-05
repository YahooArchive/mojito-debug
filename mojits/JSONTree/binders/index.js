/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, indent: 4 */
/*globals YUI, unescape, setTimeout, clearTimeout */

YUI.add('JSONTreeBinderIndex', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {

        "init": function (mojitProxy) {
            this.mojitProxy = mojitProxy;
        },

        "bind": function (node) {
            var jsonTree = new Y.mojito.debug.JSONTree(this.mojitProxy.data.get('json'), this.mojitProxy.data.get('options'));
            Y.one("#" + this.mojitProxy._viewId + "_tree").append(jsonTree.get());
        }
    };
}, '0.0.1', {requires: ['mojito', 'mojito-client', 'node', 'yui2-treeview', 'mojito-debug-json-tree']});

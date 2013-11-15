/*jslint nomen: true, indent: 4 */
/*globals unescape, setTimeout, clearTimeout */
/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('JSONTreeBinderIndex', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {

        "init": function (mojitProxy) {
            this.mojitProxy = mojitProxy;
        },

        "bind": function (node) {
            var jsonTree = new Y.Debug.JSONTree(this.mojitProxy.data.get('json'), this.mojitProxy.data.get('options'));
            Y.one("#" + this.mojitProxy._viewId + "_tree").append(jsonTree.get());
        }
    };
}, '0.0.1', {requires: ['mojito', 'mojito-client', 'node', 'yui2-treeview', 'debug-jsonTree']});

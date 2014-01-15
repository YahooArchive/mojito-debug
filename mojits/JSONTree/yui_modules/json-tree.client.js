/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true */
/*global YUI */

YUI.add('mojito-debug-json-tree', function (Y, NAME) {
    'use strict';


    function JSONTree(json, options) {
        var self = this,
            node = Y.Node.create('<div/>').addClass('yui3-skin-json'),
            tree;

        if (Y.Lang.isObject(json)) {
            tree = new Y.TreeView({
                container: node,
                nodes: self.getNodes(json)
            });

            tree.render();
        } else {
            node.append(String(json));
        }

        return node;
    }

    JSONTree.prototype = {
        getNodes: function (json) {
            var self = this,
                nodes = [];

            Y.Object.each(json, function (value, key) {
                var node = {};

                if (Y.Lang.isObject(value)) {
                    node.label = key + (Y.Lang.isArray(value) ? '(' + value.length + ')' : '');
                    node.children = self.getNodes(value);
                } else {
                    node.label = key + ': <span class="value">' + String(value) + '</span>';
                }

                nodes.push(node);
            });

            return nodes;
        }
    };

    Y.namespace('mojito.debug').JSONTree = JSONTree;
}, '0.0.1', {
    requires: [
        'node',
        'gallery-sm-treeview'
    ]
});

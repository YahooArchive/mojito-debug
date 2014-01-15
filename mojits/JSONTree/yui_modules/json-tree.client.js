/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint browser: true, nomen: true, plusplus: true */
/*global YUI */

YUI.add('mojito-debug-json-tree', function (Y, NAME) {
    'use strict';

    function JSONTree(json, options) {
        var self = this,
            node = Y.Node.create('<div/>').addClass('yui3-skin-json'),
            tree;

        if (Y.Object.size(json) === 2 && json.json && json.options) {
            options = Y.mix(json.options, options);
            json = json.json;
        }

        if (Y.Lang.isObject(json)) {
            tree = new Y.TreeView({
                container: node,
                nodes: this.getNodes(json)
            });
            tree.render();

            if (Y.Lang.isObject(options)) {
                this.addOptions(options, json, tree);
            }
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
        },

        addOptions: function (options, json, tree) {
            if (options.text) {
                this.addText(options.text, json, tree);
            }
        },

        addText: function (text, json, tree) {
            var firstLabel = tree.children[0] && tree.children[0]._htmlNode.one('.yui3-treeview-label'),
                // If the text is a string, use that instead of stringifying the json.
                jsonString = Y.Lang.isString(text) ? text : JSON.stringify(json, null, 4),
                numLines = 0,
                widthSet = false,
                textContainer = Y.Node.create('<span/>'),
                textArea = Y.Node.create('<textarea readonly wrap="off"/>')
                             .addClass('yui3-treeview-text-area'),
                textButton = Y.Node.create('<img/>')
                                   .set('title', 'Toggle JSON text, double click show JSON text on new page.')
                                   .addClass('yui3-treeview-text-button')
                                   .set('src', 'http://svn.corp.yahoo.com/docroot/images/log.png');

            Y.Array.each(jsonString, function (c) {
                if (c === '\n') {
                    numLines++;
                }
            });
            // Set the height accornding to the number of lines as long as it is
            // between the specified range.
            textArea.setStyle('height', 16 * Math.min(15, numLines));

            textArea.set("text", jsonString);
            textArea.toggleView();
            textArea.hide();

            // Toggle textarea after a single click.
            textButton.on("click", function (e) {
                textArea.toggleView();
                if (!widthSet) {
                    // Set the width to the scroll width as long as it doesn't exceed the specified width.
                    textArea.setStyle('width', Math.min(500, textArea.get('scrollWidth')));
                    widthSet = true;
                }
                e.stopPropagation();
            });

            // Open up a new window with the jsonString.
            textButton.on("dblclick", function (e) {
                var newWindow = window.open();
                newWindow.document.write("<pre>" + Y.Escape.html(jsonString) + "</pre>");
                newWindow.document.body.style.margin = 0;
                newWindow.document.close();
                e.stopPropagation();
            });

            textContainer.append(textButton);
            textContainer.append(textArea);

            firstLabel.append(textContainer);
        }
    };

    Y.namespace('mojito.debug').JSONTree = JSONTree;
}, '0.0.1', {
    requires: [
        'node',
        'gallery-sm-treeview'
    ]
});

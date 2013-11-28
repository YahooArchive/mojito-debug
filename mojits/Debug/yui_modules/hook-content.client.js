/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */
YUI.add('mojito-debug-hook-content', function (Y) {
    'use strict';
    var HookContent = function () {
        var content = Y.Node.create('<div/>');

        this.isEmpty = true;

        Y.mix(content, this);
        Y.mix(content, HookContent.prototype);

        return content;
    };

    HookContent.prototype = {
        update: function (debugData) {
            var contentIsEmpty = debugData._content === null || debugData._content === undefined,
                appendIsEmpty = debugData._append.length === 0;

            if (this.isEmpty && contentIsEmpty && appendIsEmpty) {
                this.set('text', '[Empty]');
                return;
            }

            if (!contentIsEmpty) {
                this.set('innerHTML', '');
                this._appendContent(debugData._content);
                debugData._content = null;
            }

            if (!appendIsEmpty) {
                Y.Array.each(debugData._append, function (content) {
                    this._appendContent(content);
                    //this._appendContent('</br>');
                }.bind(this));
                debugData._append = [];
            }

            this.isEmpty = false;
        },

        _appendContent: function (content) {
            if (Y.Lang.isObject(content)) {
                this.append(new Y.mojito.debug.JSONTree(Y.mojito.debug.Utils.acyclicClone(content), null).get());
            } else {
                this.append('<div>' + content + '</div>');
            }
        }
    };

    Y.namespace('mojito.debug').HookContent = HookContent;
}, '0.0.1', {
    requires: [
        'mojito-debug-utils',
        'mojito-debug-json-tree'
    ]
});

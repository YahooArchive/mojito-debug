/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, plusplus: true */
/*global YUI */

YUI.add('mojito-debug-hook-content', function (Y) {
    'use strict';
    var HookContent = function () {
        var node = Y.Node.create('<div/>').addClass('content');

        this.hook = Y.Node.create('<div/>')
                          .addClass('hook')
                          .append('<div class="line">[Empty]</div>');
        this.errors = Y.Node.create('<div/>')
                            .addClass('errors')
                            .append('<div class="title">Errors</div>');


        this.isEmpty = true;

        node.append(this.errors);
        node.append(this.hook);

        Y.mix(node, this);
        Y.mix(node, HookContent.prototype);

        return node;
    };

    HookContent.prototype = {
        update: function (debugData) {
            var hook = this.hook,
                errors = this.errors,
                i = 0,
                prevError,
                duplicateErrors = 0,
                errorsIsEmpty = debugData._errors.length === 0,
                contentIsEmpty = !debugData._content,
                appendIsEmpty = debugData._append.length === 0;

            if (!errorsIsEmpty) {
                errors.addClass('enabled');
                while (i < debugData._errors.length) {
                    if (prevError === debugData._errors[i]) {
                        duplicateErrors++;
                        debugData._errors.splice(i, 1);
                        continue;
                    } else if (duplicateErrors) {
                        debugData._errors[i - 1] = debugData._errors[i - 1] + '... (repeated ' + (duplicateErrors + 1) +  ' times) ...';
                        duplicateErrors = 0;
                    }
                    prevError = debugData._errors[i];
                    i++;
                }
                Y.Array.each(debugData._errors, function (error) {
                    this._appendLine(errors, error);
                }.bind(this));
                debugData._errors = [];

                if (this.isEmpty) {
                    hook.set('innerHTML', '');
                }
            }

            if (!contentIsEmpty) {
                hook.set('innerHTML', '');
                this._appendLine(hook, debugData._content);
                debugData._content = null;
                this.isEmpty = false;
            }

            if (!appendIsEmpty) {
                Y.Array.each(debugData._append, function (content) {
                    this.appendLine(hook, content);
                }.bind(this));
                debugData._append = [];
                this.isEmpty = false;
            }

            if (contentIsEmpty && appendIsEmpty) {
                this.isEmpty = true;
            }

            if (errors.hasClass('enabled') && !this.isEmpty) {
                errors.setStyle('margin-bottom', 10);
            } else {
                errors.setStyle('margin-bottom', 0);
            }
        },

        _appendLine: function (container, line) {
            if (Y.Lang.isObject(line)) {
                // TODO should not need to remove cycles if JSONTree loaded nodes lazily.
                container.append(new Y.mojito.debug.JSONTree(Y.mojito.debug.Utils.removeCycles(line), null).get());
            } else {
                container.append('<div class="line">' + line + '</div>');
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

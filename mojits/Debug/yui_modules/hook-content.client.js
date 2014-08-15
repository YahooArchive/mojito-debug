/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, plusplus: true, continue: true */
/*global YUI */

YUI.add('mojito-debug-hook-content', function (Y) {
    'use strict';
    var HookContent = function () {
        var node = Y.Node.create('<div/>').addClass('debug-content');

        this.hook = Y.Node.create('<div/>')
                          .addClass('hook')
                          .append('<div class="debug-line">[Empty]</div>');
        this.errors = Y.Node.create('<div/>')
                            .addClass('debug-errors')
                            .append('<div class="debug-title">Errors</div>');


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
                errors.addClass('debug-enabled');
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
                if (this.isEmpty) {
                    hook.set('innerHTML', '');
                }
                Y.Array.each(debugData._append, function (content) {
                    this._appendLine(hook, content);
                }.bind(this));
                debugData._append = [];
                this.isEmpty = false;
            }

            if (errors.hasClass('debug-enabled') && !this.isEmpty) {
                errors.setStyle('margin-bottom', 10);
            } else {
                errors.setStyle('margin-bottom', 0);
            }

            this._executeInlinedScripts(hook._node);
        },

        // Any scripts contain in assets.blob must be created using document.createElment('script'),
        // and then replaced, otherwise the scripts never get executed.
        _executeInlinedScripts: function (node) {
            var i,
                child,
                script;

            if (node.tagName === 'SCRIPT') {
                script = document.createElement('script');
                script.text = node.text;
                for (i = 0; i < node.attributes.length; i++) {
                    if (node.attributes[i].specified) {
                        script[node.attributes[i].name] = node.attributes[i].value;
                    }
                }
                node.parentNode.replaceChild(script, node);
                return;
            }

            for (i = 0; i < node.children.length; i++) {
                child = node.children[i];
                this._executeInlinedScripts(child);
            }
        },

        _appendLine: function (container, line) {
            if (Y.Lang.isObject(line)) {
                container.append(new Y.mojito.debug.JSONTree(line));
            } else {

                container.append('<div class="debug-line">' + line + '</div>');
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

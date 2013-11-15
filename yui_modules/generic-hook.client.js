YUI.add('mojito-debug-generic-hook', function (Y) {
    'use strict';
    var GenericHook = function (debugData) {
        var content = Y.Node.create('<div/>');

        if (!debugData.hasOwnProperty('content')) {
            content.set('text', '[Empty]');
        } else if (Y.Lang.isObject(debugData.content)) {
            content.append(new Y.mojito.debug.JSONTree(Y.mojito.debug.Utils.acyclicClone(debugData.content), null).get());
        } else {
            content = Y.Node.create(debugData.content);
        }

        return content;
    };

    Y.namespace('mojito.debug').GenericHook = GenericHook;
}, '0.0.1', {
    requires: [
        'mojito-debug-utils',
        'mojito-debug-json-tree'
    ]
});

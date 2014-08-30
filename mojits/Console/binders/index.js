/*jslint plusplus: true */
YUI.add('ConsoleIndexBinder', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mp) {
            this.mp = mp;
        },

        bind: function (node) {
            var debugConsole = new Y.mojito.debug.console.Log(node, this.mp);
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-console-log'
    ]
});

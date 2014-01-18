/*jslint plusplus: true */
YUI.add('mojit-hook-binder-index', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            Y.Test.log(Y.Debug, NAME + ' init executed.');
            this.mojitProxy = mojitProxy;
        },

        bind: function (node) {
            this.node = node;
        },

        refresh: function (refreshOnServer) {
            Y.Test.log(Y.Debug, NAME + ' refresh executed.');
            Y.Debug.on('mojit-hook', function (debugData) {
                debugData.location = 'Client';
                debugData.version++;
            });
            this.mojitProxy.invoke('index', {
                params: {
                    body: {
                        debugData: Y.Debug.get('mojit-hook').debugData
                    }
                },
                rpc: refreshOnServer
            }, function (error, data, meta) {
                if (error) {
                    Y.Debug.error('mojit-hook', error, 'error', NAME);
                    return;
                }
                // Replacing this node with the new rendered mojit-hook.
                this.node.replace(data);
                // This will result in a new binder being created for mojit-hook,
                // so we need to change the viewId being used by mojit-hook such that
                // the hook's binder is reflected.
                // This is done automatically when ac.debug.render is called on a mojit hook,
                // however since the rendering was done through an invoke, the debugger cannot know
                // what will be done with the rendered data so it shouldn't try to match any resulting binders
                // with this mojit hook. In this case we know that there only one binder will result and
                // it belongs to mojit-hook.
                Y.Debug.get('mojit-hook')._viewId = meta.binders[Y.Object.keys(meta.binders)[0]].viewId;
            }.bind(this));
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'test-log'
    ]
});

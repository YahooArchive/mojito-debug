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
            }, function (error, data) {
                // Make sure mojitHook is rendered
                this.node.replace(data);
            }.bind(this));
        }
    };
}, '0.0.1', {
    requires: [
        'mojit-debug-addon',
        'test-log'
    ]
});

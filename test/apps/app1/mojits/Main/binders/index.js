YUI.add('main-binder-index', function (Y, NAME) {
    'use strict';
    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            Y.Test.log(Y.Debug, NAME + ' init executed.');

            this.mojitProxy = mojitProxy;
            this.mojitHookData = Y.Debug.get('mojit-hook');
        },

        bind: function (node) {
            this.node = node;
            node.one('#refresh-main').on('click', this.refreshMain.bind(this));
            node.one('#refresh-mojit-hook').on('click', this.refreshMojitHook.bind(this));
            node.one('#toggle-mojit-hook').on('click', this.toggleMojitHook.bind(this));
        },

        refreshMain: function () {
            Y.Debug.log('---- Refresh Main Mojit -----');
            var refreshOnServer = this.node.one('input[name=main-location]:checked').get('value') === 'server';
            this.mojitProxy.invoke('index', {
                rpc: refreshOnServer
            }, function (error, data) {
                this.node.replace(data);
            }.bind(this));
        },

        refreshMojitHook: function () {
            Y.Debug.log('---- Refresh Mojit Hook -----');
            var refreshOnServer = this.node.one('input[name=mojit-hook-location]:checked').get('value') === 'server';
            if (this.mojitHookData) {
                this.mojitHookData.binder.refresh(refreshOnServer);
            }
        },

        toggleMojitHook: function () {
            Y.Debug.log('---- Toggle Mojit Hook -----');
            if (this.mojitHookData) {
                this.mojitHookData.hookContainer.toggle();
            }
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'test-log'
    ]
});

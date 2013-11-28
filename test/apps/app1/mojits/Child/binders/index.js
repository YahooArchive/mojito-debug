/*jslint plusplus: true, regexp: true */
YUI.add('child-binder-index', function (Y, NAME) {
    'use strict';
    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            Y.Test.log(Y.Debug, NAME + ' init executed.');

            this.mojitProxy = mojitProxy;
            this.mojitHookData = Y.Debug.get('mojit-hook');
        },

        bind: function (node) {
            this.node = node;
            node.one('#refresh-child').on('click', this.refreshChild.bind(this));
            node.one('#refresh-simple-hook').on('click', this.refreshSimpleHook.bind(this));
            node.one('#append-to-simple-hook').on('click', this.appendToSimpleHook.bind(this));
        },

        refreshChild: function () {
            Y.Debug.log('---- Refresh Child Mojit -----');
            var refreshOnServer = this.node.one('input[name=child-location]:checked').get('value') === 'server';
            this.mojitProxy.invoke('index', {
                rpc: refreshOnServer
            }, function (error, data) {
                this.node.replace(data);
            }.bind(this));
        },

        refreshSimpleHook: function () {
            Y.Debug.log('---- Refresh Simple Hook -----');
            var version;
            Y.Debug.on('simple-hook', function (debugData) {
                version = ++debugData.version;
            });
            Y.Debug.setContent('simple-hook', {
                version: version,
                'simple-hook': {
                    created: new Date().toTimeString().replace(/ GMT.+/, ''),
                    location: 'Client'
                }
            });
        },

        appendToSimpleHook: function () {
            Y.Debug.log('---- Append to Simple Hook -----');
            var version;

            Y.Debug.on('simple-hook', function (debugData) {
                version = ++debugData.version;
            });
            Y.Debug.appendContent('simple-hook', {
                version: version,
                'simple-hook': {
                    created: new Date().toTimeString().replace(/ GMT.+/, ''),
                    location: 'Client'
                }
            });
        }
    };
}, '0.0.1', {
    requires: [
        'test-log',
        'mojito-debug-addon'
    ]
});

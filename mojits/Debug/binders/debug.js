/*jslint nomen: true */
YUI.add('mojito-debug-binder', function (Y, NAME) {
    'use strict';

    // Get access to the Mojito client.
    var MojitoClient = {},
        mojitoClientConstructor = Y.mojito.Client;

    Y.mojito.Client = function () {
        Y.mix(MojitoClient, mojitoClientConstructor.prototype);
        return mojitoClientConstructor.apply(MojitoClient, arguments);
    };

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {

            var command = {
                    instance: {
                        controller: 'debug-controller',
                        base: mojitProxy._base,
                        type: mojitProxy.type,
                        instanceId: mojitProxy._instanceId,
                        config: Y.mojito.util.copy(mojitProxy.config),
                        data: mojitProxy.data
                    },
                    params: {
                        url: this.getUrlParams()
                    }
                },
                adapter = new Y.mojito.OutputHandler(mojitProxy._viewId, function () {}, MojitoClient),
                ac = {};/*new Y.mojito.ActionContext({
                    command: command,
                    controller: Y.mojito.util.heir(Y.mojito.controllers[command.instance.controller]),
                    dispatcher: MojitoClient.dispatcher,
                    adapter: adapter,
                    store: MojitoClient.store
                });*/

            Y.Array.each(['composite', 'params', 'assets'], function (addon) {
                ac[addon] = new Y.mojito.addons.ac[addon](command, adapter, ac);
            });

            // Allow client side YUI modules to use the debug addon through Y.Debug
            Y.Debug = window.top.DEBUGGER = new Y.mojito.addons.ac.debug(command, adapter, ac);
            Y.Debug.hooks = mojitProxy.data.get('hooks');

            // put app into iframe
            Y.one('#app').set('innerHTML', mojitProxy.data.get('app'));

            // Update debugger
            Y.Debug._update();
        },

        getUrlParams: function () {
            var paramArray = window.location.search.substring(1).split(),
                paramMap = {};
            Y.Array.each(paramArray, function (param) {
                var parts = param.split('=');
                paramMap[parts[0]] = parts[1];
            });
            return paramMap;
        }
    };

}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'mojito-action-context',
        'mojito-client',
        'mojito-output-buffer',
        'debug-controller'
    ]
});

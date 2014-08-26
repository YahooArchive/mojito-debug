YUI.add('ConsoleController', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            // TODO: only accept if arrived through /debug

            var debugConsole = ac.dispatcher.store.debug.console;
            ac.data.set('latestLogs', debugConsole.getAll());
            ac.assets.addCss('./index.css');
            ac.done();
        },

        getLatestLogs: function (ac) {
            // TODO: only accept if arrived through /debug/tunnel

            var debugConsole = ac.dispatcher.store.debug.console,
                latest = ac.params.body('latest');

            debugConsole.onLog(function (latestLogs) {
                ac.http.setHeader('Content-type', 'application/json');
                ac.done(JSON.stringify(latestLogs));
            }, latest);
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-assets-addon',
        'mojito-data-addon',
        'mojito-params-addon',
        'mojito-http-addon'
    ]
});

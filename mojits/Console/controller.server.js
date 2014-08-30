/*jslint nomen: true */
YUI.add('ConsoleController', function (Y, NAME) {
    'use strict';

    var appConfig,
        LOG_LEVEL_ORDER = ["debug", "mojito", "info", "warn", "error", "none"];

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }

            var debugConsole = ac.dispatcher.store.debug.console;
            ac.data.set('latestLogs', debugConsole.getAll());
            ac.data.set('enabled', debugConsole.enabled);
            ac.data.set('logLevel', Y.config.logLevel);
            ac.assets.addCss('./index.css');
            ac.done();
        },

        getLatestLogs: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }

            var debugConsole = ac.dispatcher.store.debug.console,
                latest = ac.params.body('latest');

            debugConsole.onLog(function (latestLogs) {
                ac.http.setHeader('Content-type', 'application/json');
                ac.done(JSON.stringify(latestLogs));
            }, latest);
        },

        updateConsole: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }

            var store = ac.dispatcher.store,
                debugConsole = store.debug.console,
                update = ac.params.body('update') || {},
                message,
                logLevelChange;

            if (update.enabled !== undefined) {
                message = 'Debug console ' + (update.enabled ? 'enabled' : 'disabled') + '.';

                if (!update.enabled) {
                    Y.log(message, 'info', NAME);
                }
                debugConsole[update.enabled ? 'hookConsole' : 'unHookConsole']();
                if (update.enabled) {
                    Y.log(message, 'info', NAME);
                }
            }

            if (LOG_LEVEL_ORDER.indexOf(update.logLevel) !== -1) {
                message = 'YUI log level changed from ' + Y.config.logLevel + ' to ' + update.logLevel + '.';

                logLevelChange = LOG_LEVEL_ORDER.indexOf(update.logLevel) - LOG_LEVEL_ORDER.indexOf(Y.config.logLevel);
                if (logLevelChange > 0) {
                    Y.log(message, 'info', NAME);
                }
                Y.applyConfig({logLevel: update.logLevel});
                if (logLevelChange < 0) {
                    Y.log(message, 'info', NAME);
                }
            }
            ac.done('');
        },

        _denyTunnelRequest: function (ac) {
            var req = ac.http.getRequest(),
                res = ac.http.getResponse();

            appConfig = appConfig || ac.config.getAppConfig({}) || {};

            if (req.url === (appConfig.tunnel || '/tunnel')) {
                clearTimeout(ac._timer);
                ac._timer = null;
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/html');
                res.end('Not Found');
                Y.log('Denied non debug tunnel request from (' + req.connection.remoteAddress + ').', 'warn', NAME);
                return true;
            }
            return false;
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-assets-addon',
        'mojito-config-addon',
        'mojito-data-addon',
        'mojito-params-addon',
        'mojito-http-addon'
    ]
});

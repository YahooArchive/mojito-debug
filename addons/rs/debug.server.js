/*jslint nomen: true */
YUI.add('addon-rs-debug', function (Y, NAME) {
    'use strict';

    var libpath = require('path'),
        libycb = require('ycb'),
        APP_CONFIG_PATH = libpath.join(__dirname, '../../application.json'),
        ROUTES_CONFIG_PATH = libpath.join(__dirname, '../../routes.json');

    function RSAddonDebug() {
        RSAddonDebug.superclass.constructor.apply(this, arguments);
    }

    RSAddonDebug.NS = 'debug';

    Y.extend(RSAddonDebug, Y.Plugin.Base, {

        initializer: function (config) {
            this.rs = config.host;

            this.overwriteAppConfig = false;

            this.mergeAppConfig();
        },

        mergeAppConfig: function () {
            this._appConfigCache = {};
            this.afterHostMethod('getAppConfig', this.getAppConfig, this);
        },

        getAppConfig: function (ctx) {
            var key,
                modifiedAppConfig,
                newAppConfig;

            ctx = this.rs.blendStaticContext(ctx);
            key = JSON.stringify(ctx || {});

            if (this._appConfigCache[key]) {
                return;
            }
            modifiedAppConfig = Y.Do.originalRetVal;
            newAppConfig = this.rs.config.readConfigYCB(APP_CONFIG_PATH, ctx);

            if (newAppConfig) {
                Y.mix(modifiedAppConfig, newAppConfig, this.overwriteAppConfig, null, 0, true);
            }

            // Add debugger's routes.json to appConfig's routesFiles array.
            modifiedAppConfig.routesFiles = modifiedAppConfig.routesFiles || [];
            modifiedAppConfig.routesFiles.push(ROUTES_CONFIG_PATH);

            // Add debugger's middleware to appConfig's middleware array.
            //modifiedAppConfig.middleware = modifiedAppConfig.middleware || [];
            //modifiedAppConfig.middleware.unshift("./node_modules/mojito-debug/middleware/debug.js");//MIDDLEWARE_PATH);
            //debugger;

            this.rs._appConfigCache[key] = JSON.stringify(modifiedAppConfig);
            this._appConfigCache[key] = true;
            return Y.Do.AlterReturn(null, modifiedAppConfig);
        }
    });

    Y.namespace('mojito.addons.rs').debug = RSAddonDebug;
}, {
    requires: [
        'plugin',
        'oop'
    ]
});

/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true */
/*global YUI */

YUI().applyConfig({
    modules: {
        'mojito-debug-console': {
            fullpath: require('path').join(__dirname, '../../yui_modules/console.server.js')
        }
    }
});

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
            var staticAppConfig = config.host.getStaticAppConfig(),
                options;

            this.rs = config.host;
            this.debugAppConfig = this.rs.config.readConfigYCB(APP_CONFIG_PATH, {runtime: 'server'});

            Y.mix(staticAppConfig, this.debugAppConfig, false, null, 0, true);
            options = staticAppConfig.specs.debug.config.options;
            this.mergeAppConfig();
            this.console = new Y.mojito.debug.Console(options['console-max-logs']);
            if (options['enable-console']) {
                this.console.hookConsole();
            }
        },

        mergeAppConfig: function () {
            this._appConfigCache = {};
            this.afterHostMethod('getAppConfig', this.getAppConfig, this);
        },

        getAppConfig: function (ctx) {
            var key,
                modifiedAppConfig,
                debugAppConfig;

            ctx = this.rs.blendStaticContext(ctx);
            key = JSON.stringify(ctx || {});

            if (this._appConfigCache[key]) {
                return;
            }
            modifiedAppConfig = Y.Do.originalRetVal;

            if (ctx.runtime === 'server') {
                Y.mix(modifiedAppConfig, this.debugAppConfig, false, null, 0, true);
            }

            // Add debugger's routes.json to appConfig's routesFiles array.
            modifiedAppConfig.routesFiles = modifiedAppConfig.routesFiles || [];
            modifiedAppConfig.routesFiles.push(ROUTES_CONFIG_PATH);

            this.rs._appConfigCache[key] = JSON.stringify(modifiedAppConfig);
            this._appConfigCache[key] = true;
            return Y.Do.AlterReturn(null, modifiedAppConfig);
        }
    });

    Y.namespace('mojito.addons.rs').debug = RSAddonDebug;

}, '0.0.1', {
    requires: [
        'plugin',
        'oop',
        'mojito-debug-console'
    ]
});

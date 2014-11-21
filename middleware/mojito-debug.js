/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen:true */

var liburl = require('url');

module.exports = function (midConfig) {
    'use strict';

    var Y = midConfig.Y,
        store = midConfig.store,
        DEBUG_PATH = '/debug',
        DEBUG_TUNNEL_PATH = DEBUG_PATH + '/tunnel',
        DEBUG_PARAM_REGEXP = /^debug(\.[a-zA-Z0-9]+)?$/,
        dispatcher = require(midConfig.store._config.mojitoRoot + '/dispatcher.js');

    return function (req, res, next) {
        var appConfig = store.getAppConfig(req.context), url, key,
            originalUrl = req.url;

        // Check if the url has a debug parameter if the debugger is enabled
        // and not already in debug mode.
        if (appConfig.specs.debug.enabled && !req.debugging) {

            url = liburl.parse(req.url, true);

            if (req.url.indexOf(DEBUG_TUNNEL_PATH) === 0) {
                req._tunnel = req._tunnel || {};
                req._tunnel.rpcReq = {};
            } else if (req.url.indexOf(DEBUG_PATH) !== 0) {
                for (key in url.query) {
                    if (url.query.hasOwnProperty(key) && DEBUG_PARAM_REGEXP.test(key)) {

                        // Set the request url to the debugger route which will
                        // handle the request.
                        req.url = DEBUG_PATH;

                        // The first debug parameter wins!
                        break;
                    }
                }
            }

            if (req.url.indexOf(DEBUG_PATH) === 0) {
                req.globals = req.globals || {};
                req.globals['mojito-debug'] = req.globals['mojito-debug'] || {};
                req.globals['mojito-debug'].enabled = true;
                req.globals['mojito-debug'].originalUrl = originalUrl;
                req.globals['mojito-debug'].debugStart = process.hrtime();

                // This function allows another middleware to skip the execution of the remaining
                // middleware in order to dispatch the debugger immediately.
                if (req.url.indexOf(DEBUG_PATH + '/') === -1) {
                    req.globals['mojito-debug'].dispatch = function (req, res, next) {

                        var command = {
                            instance: {}
                        };

                        command.instance.base = 'debug';
                        command.action = 'index';
                        command.context = req.context;
                        command.params = {
                            route: Y.mix({}, req.params),
                            url: req.query || {},
                            body: req.body || {},
                            file: {}
                        };

                        req.command = command;

                        dispatcher.handleRequest(req, res);
                    };
                }
            }
        } else if (req.globals && req.globals['mojito-debug']) {
            req.globals['mojito-debug'] = null;
        }

        next();
    };
};

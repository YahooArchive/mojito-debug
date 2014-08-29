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
        DEBUG_PARAM_REGEXP = /^debug(\.[a-zA-Z0-9]+)?$/;

    return function (req, res, next) {
        var appConfig = store.getAppConfig(req.context), url, key,
            originalUrl = req.url;

        if (appConfig.specs.debug.enabled) {

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
                req.globals['mojito-debug'] = {
                    originalUrl: originalUrl,
                    debugStart: process.hrtime()
                };
            }
        }

        next();
    };
};

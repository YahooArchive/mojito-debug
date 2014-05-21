/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true */

var liburl = require('url');

module.exports = function (midConfig) {
    'use strict';

    var Y = midConfig.Y,
        store = midConfig.store,
        DEBUG_PARAM_REGEXP = /^debug(\.[a-zA-Z0-9]+)?$/;

    return function (req, res, next) {
        var appConfig = store.getAppConfig(req.context), url, key;

        if (appConfig.specs.debug.enabled) {

            url = liburl.parse(req.url, true);

            if (url.pathname.indexOf('/debug') === 0) {
                // If the entry point is 'debug', reroute to page not found.
                // This prevents the user from calling the debugger directly
                // through its entry point instead of a debug parameter.
                req.url = null;
                Y.log('Request attempting to access debugger route directly!', 'warn');

            } else {

                for (key in url.query) {
                    if (url.query.hasOwnProperty(key) && DEBUG_PARAM_REGEXP.test(key)) {

                        // Set mojito-debug global to an object that indicates
                        // that the debugger is enabled and what the original
                        // url was...

                        req.globals = req.globals || {};
                        req.globals['mojito-debug'] = {
                            originalUrl: req.url,
                            debugStart: process.hrtime()
                        };

                        // Set the request url to the debugger route which will
                        // handle the request.
                        req.url = '/debug' + req.url;

                        // The first debug parameter wins!
                        break;
                    }
                }
            }
        }

        next();
    };
};

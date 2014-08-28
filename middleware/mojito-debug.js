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
        var appConfig = store.getAppConfig(req.context), url, key,
            originalUrl = req.url;

        if (appConfig.specs.debug.enabled) {

            url = liburl.parse(req.url, true);

            if (req.url.indexOf('/debug') !== 0) {
                for (key in url.query) {
                    if (url.query.hasOwnProperty(key) && DEBUG_PARAM_REGEXP.test(key)) {

                        // Set the request url to the debugger route which will
                        // handle the request.
                        req.url = '/debug';

                        // The first debug parameter wins!
                        break;
                    }
                }
            }

            if (req.url.indexOf('/debug') === 0) {
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

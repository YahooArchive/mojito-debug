/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, regexp: true */

module.exports = function (midConfig) {
    'use strict';

    var store = midConfig.store;

    return function (req, res, next) {
        var appConfig = store.getAppConfig(req.context);

        if (appConfig.specs.debug.enabled) {
            if (/^\/debug.*$/.test(req.url)) {
                // If the entry point is 'debug', reroute to page not found. This prevents the user from calling
                // the debugger directly through its entry point instead of through a debug parameter.
                req.url = null;
                console.warn('Request attempting to access debugger route directly.');

            } else if (/^\/.*?[\?&]debug(\.[^=&]+)?(=[^&]*)?(&|$)/.test(req.url)) {
                // Set mojito-debug global to an object that indicates that the debugger is enabled and
                // what was the original url.
                req.globals = req.globals || {};
                req.globals['mojito-debug'] = {};
                req.globals['mojito-debug'].originalUrl = req.url;

                // Set the request url to the debugger route which will handle the request.
                req.url = '/debug' + req.url;
            }
        }
        next();
    };
};
/*jslint regexp: true */
YUI.add('test-log', function (Y) {
    'use strict';
    Y.namespace('Test').log = function (debug, message) {
        var time = new Date().toTimeString().replace(/ GMT.+/, ''),
            location = typeof window === 'object' ? 'Client' : 'Server';
        if (debug) {
            debug.log('[<span style="color:' + (location === 'Client' ? '#0D862F' : '#203499') + '">' + location + '</span>] ' + time + ': ' + message);
        }

        return {
            location: location,
            time: time
        };
    };
});

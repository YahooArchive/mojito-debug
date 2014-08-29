/*jslint nomen: true */
YUI.add('UsageController', function (Y, NAME) {
    'use strict';

    var DEBUG_TUNNEL_PATH = '/debug/tunnel',
        MAX_SAVED_HEAPS = 10,
        HEAP_DUMP_NAME = 'heapdump-{time}.heapsnapshot',
        lib = {
            childProcess: require('child_process'),
            fs: require('fs'),
            usage: require('usage')
        },
        appConfig,
        heapdump = require('heapdump'),
        heapDumps = {};

    Y.namespace('mojito.controllers')[NAME] = {
        index: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }
            this._getUsage(function (usage) {
                ac.data.set('heapDumps', heapDumps);
                ac.data.set('usage', usage);
                ac.done();
            });
        },

        createHeapDump: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }

            var time = Date.now(),
                dumpName = HEAP_DUMP_NAME.replace('{time}', time);

            if (Y.Object.isEmpty(heapDumps)) {
                this._deleteHeapDump();
            }

            heapdump.writeSnapshot(dumpName, function () {
                lib.fs.stat(dumpName, function (error, stats) {
                    if (!error) {
                        heapDumps[time] = {
                            size: stats.size,
                            time: time
                        };
                    }
                    ac.done(JSON.stringify({
                        time: time,
                        size: stats && stats.size,
                        error: error
                    }));
                });

            });
        },

        deleteHeapDump: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }
            var time = ac.params.body('time');
            this._deleteHeapDump(time, function (error) {
                ac.done(error || '');
            });
        },

        downloadHeapDump: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }
            var time = ac.params.url('time'),
                dumpName = HEAP_DUMP_NAME.replace('{time}', time),
                readStream,
                req = ac.http.getRequest(),
                res = ac.http.getResponse(),
                return404 = function () {
                    delete heapDumps[time];
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/html');
                    res.end('Not Found');
                    Y.log(dumpName + ' was not found.', 'warn', NAME);
                };

            clearTimeout(ac._timer);
            ac._timer = null;

            if (!heapDumps[time]) {
                return return404();
            }

            lib.fs.exists(dumpName, function (exists) {
                if (!exists) {
                    return return404();
                }
                res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': 'attachment;filename="' + dumpName + '"',
                    'Content-Length': heapDumps[time].size
                });
                readStream = lib.fs.createReadStream(dumpName);
                readStream.on('error', function () {
                    res.end('Error reading ' + dumpName);
                });
                readStream.pipe(res);
            });
        },

        updateUsage: function (ac) {
            if (this._denyTunnelRequest(ac)) {
                return;
            }
            this._getUsage(function (usage) {
                ac.http.setHeader('Content-type', 'application/json');
                ac.done(JSON.stringify(usage));
            });
        },

        _getUsage: function (cb) {
            var pid = process.pid;
            lib.usage.lookup(pid, function (err, result) {
                return cb && cb(result || {});
            });
        },

        _deleteHeapDump: function (time, callback) {
            if (Y.Lang.isFunction(time)) {
                callback = time;
                time = undefined;
            }

            var dumpName = HEAP_DUMP_NAME.replace('{time}', time === undefined ? '*' : time),
                child = require('child_process').spawn('/bin/sh', ['-c', 'rm -rf ' + dumpName]),
                error;

            if (time) {
                delete heapDumps[time];
            } else {
                heapDumps = {};
            }

            child.stderr.setEncoding('utf8');
            child.stderr.on('data', function (data) {
                Y.log(data, 'error', NAME);
            });
            child.on('error', function (code) {
                Y.log('Unable to remove heapdumps.', 'error', NAME);
            });
            child.on('close', function (code) {
                var error = code !== 0 ? 'rm -rf ' + dumpName + ' failed with code ' + code : null;
                if (error) {
                    Y.log(error, 'error', NAME);
                }
                return callback && callback(error);
            });
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
        'mojito-config-addon',
        'mojito-data-addon',
        'mojito-http-addon',
        'mojito-params-addon'
    ]
});
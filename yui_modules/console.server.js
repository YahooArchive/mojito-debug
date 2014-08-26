/*jslint nomen: true, plusplus: true */
YUI.add('mojito-debug-console', function (Y, NAME) {
    'use strict';

    var MAX_SIZE = 1000,
        LOG_EVENT = NAME + '_onLog',
        LOG_EVENT_TIMEOUT = 10 * 60 * 1000,
        AnsiToHtml = require('ansi-to-html'),
        ansiToHtml = new AnsiToHtml();

    function Console(maxSize) {
        this.head = {
            num: 0
        };
        this.tail = this.head;
        this.size = 0;
        this.sizeLimit = maxSize || MAX_SIZE;
    }

    Console.prototype = {
        log: function (line, isError) {
            this._add(line, isError);
            this._checkSize();
        },

        _add: function (line, isError) {
            var prev = this.tail;
            this.tail = {
                line: line,
                time: (new Date()).getTime(),
                isError: isError,
                prev: prev,
                num: prev.num + 1
            };

            prev.next = this.tail;
            try {
                this.tail.line = ansiToHtml.toHtml(this.tail.line);
                Y.fire(LOG_EVENT);
            } catch (e) {
            }
        },

        _checkSize: function () {
            this.size++;
            if (this.size === this.sizeLimit) {
                this.log = function () {
                    this._add();
                    this.head = this.head.next;
                }.bind(this);
            }
        },

        onLog: function (callback, latest) {
            var self = this,
                /* TODO: Disabled this since the ajax call to the server may produce logs,
                * which would lead continous ajax calls to get the new logs.*/
                latestLogs = this.getSinceLatest(latest),
                eventHandler,
                waitOnEventTimeout;

            if (latestLogs.length > 0) {
                callback(latestLogs);
                return null;
            }

            eventHandler = Y.on(LOG_EVENT, function () {
                if (callback.called) {
                    console.log('Callback already called (event): ' + callback.id);
                }
                clearTimeout(waitOnEventTimeout);
                eventHandler.detach();
                callback(self.getSinceLatest(latest));
                callback.called = true;

            });
            // Timeout after some time to ensure that the number of subscribers
            // does not grow indefinitely.
            waitOnEventTimeout = setTimeout(function () {
                if (callback.called) {
                    console.log('Callback already called (timeout): ' + callback.id);
                }
                eventHandler.detach();
                callback([]);
                callback.called = true;
            }, LOG_EVENT_TIMEOUT);
        },

        getAll: function () {
            return this.getSinceLatest(0);
        },

        getSinceLatest: function (latest, limit) {
            var logs = [],
                currentLog = this.tail;

            latest = latest || 0;
            limit = limit || this.size;

            while (currentLog.num > latest && logs.length < limit) {
                logs.push(Y.mix({}, currentLog, true, ['num', 'line', 'time', 'isError']));
                currentLog = currentLog.prev;
            }
            return logs;
        },

        hookConsole: function () {
            var self = this;
            if (!self.stdOutWrite) {
                self.stdOutWrite = process.stdout.write;
                process.stdout.write = function (line) {
                    self.log(line);
                    self.stdOutWrite.apply(process.stdout, arguments);
                };
            }

            if (!self.stdErrWrite) {
                self.stdErrWrite = process.stderr.write;
                process.stderr.write = function (line) {
                    self.log(line, true);
                    self.stdErrWrite.apply(process.stderr, arguments);
                };
            }
        }
    };

    Y.namespace('mojito.debug').Console = Console;
}, '0.0.1', {
    requires: [
        'event-custom'
    ]
});

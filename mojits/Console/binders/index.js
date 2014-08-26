/*jslint plusplus: true */
YUI.add('ConsoleIndexBinder', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mp) {
            this.mp = mp;
            this.lastError = null;
            this.continualErrors = 0;
            this.latest = 0;
        },

        bind: function (node) {
            this.node = node;
            this.logs = node.one('.debug-console-logs');
            this.menu = node.one('.debug-console-menu');
            this.update(this.mp.data.get('latestLogs'));
        },

        update: function (latestLogs) {
            var self = this;

            if (latestLogs && latestLogs.length > 0) {
                self.appendLogs(latestLogs);
                self.latest = latestLogs[0].num;
            }

            self.mp.invoke('getLatestLogs', {
                params: {
                    body: {
                        latest: self.latest
                    }
                }
            }, function (error, latestLogs, meta) {
                var time;
                if (error === 'Unexpected end of input' || self.continualErrors > 5) {
                    return;
                }

                if (error) {
                    time = (new Date()).getTime();
                    if (self.lastError && self.lastError > (time - 5000)) {
                        self.continualErrors++;
                    } else {
                        self.continualErrors = 0;
                    }
                    self.lastError = time;
                } else {
                    self.continualErrors = 0;
                }
                self.update(latestLogs);
            });
        },

        appendLogs: function (latestLogs) {
            var self = this,
                logs = self.logs,
                line,
                log,
                i,
                scrollToBottom = logs.get('scrollHeight') === logs.get('offsetHeight') + logs.get('scrollTop');

            for (i = latestLogs.length - 1; i >= 0; i--) {
                log = latestLogs[i];
                line = Y.Node.create('<p/>');
                line.append(log.line);
                logs.append(line);
                if (scrollToBottom) {
                    self.scrollToBottom();
                }
            }
        },

        scrollToBottom: function () {
            var logs = this.logs;
            logs.set('scrollTop', logs.get('scrollHeight') - logs.get('offsetHeight'));
        }
    };
}, '0.0.1', {
    requires: [
        'node'
    ]
});

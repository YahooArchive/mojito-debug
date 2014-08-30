/*jslint plusplus: true */
YUI.add('mojito-debug-console-log', function (Y, NAME) {
    'use strict';

    var CONSOLE_LOG = '.debug-console-logs',
        SCROLL_ARROWS = '.debug-console-scroll',
        SCROLLED_DOWN_CLASS = 'debug-console-scrolled-down',
        SCROLLED_UP_CLASS = 'debug-console-scrolled-up';

    function Log(node, mp) {
        var self = this;
        this.node = node;
        this.mp = mp;
        this.lastError = null;
        this.continualErrors = 0;
        this.latest = 0;

        this.logs = node.one(CONSOLE_LOG);
        this.update(this.mp.data.get('latestLogs'));
        this.menu = new Y.mojito.debug.console.Menu(node, mp);
        this.scrollArrows = node.one(SCROLL_ARROWS);
        this.scrollArrows.on('click', this.scroll, this);

        this.scrollToBottom();

        // Detect scrolling at most every 500ms while scrolling.
        (function detectScroll() {
            self.updateScrollArrows();
            self.logs.once('scroll', function () {
                setTimeout(detectScroll, 500);
            });
        }());
    }

    Log.prototype = {

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
                time,
                num,
                line,
                log,
                i,
                scrollToBottom = logs.get('scrollHeight') === logs.get('offsetHeight') + logs.get('scrollTop');

            for (i = latestLogs.length - 1; i >= 0; i--) {
                log = latestLogs[i];
                line = Y.Node.create('<p/>');

                num = Y.Node.create('<span/>');
                num.addClass('debug-console-num');
                num.set('text', '[' + log.num + ']');

                time = Y.Node.create('<span/>');
                time.addClass('debug-console-time');
                time.set('text', '[' + Y.Date.format(new Date(log.time), {format: '%H:%M:%S %Y-%m-%d'}) + ']');

                line.append(num);
                line.append(time);
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
        },

        updateScrollArrows: function () {
            var logs = this.logs,
                logHeight = logs.get('offsetHeight'),
                scrollHeight = logs.get('scrollHeight'),
                scrollTop = logs.get('scrollTop');

            if (logHeight === scrollHeight) {
                this.scrollArrows.removeClass(SCROLLED_DOWN_CLASS);
                this.scrollArrows.removeClass(SCROLLED_UP_CLASS);
            } else if ((scrollTop + (logHeight / 2)) > (scrollHeight / 2)) {
                this.scrollArrows.removeClass(SCROLLED_UP_CLASS);
                this.scrollArrows.addClass(SCROLLED_DOWN_CLASS);
            } else {
                this.scrollArrows.removeClass(SCROLLED_DOWN_CLASS);
                this.scrollArrows.addClass(SCROLLED_UP_CLASS);
            }
        },

        scroll: function () {
            var logs = this.logs,
                toTop,
                anim;

            if (this.scrollArrows.hasClass(SCROLLED_DOWN_CLASS)) {
                toTop = 0;
            } else if (this.scrollArrows.hasClass(SCROLLED_UP_CLASS)) {
                toTop = logs.get('scrollHeight') - logs.get('offsetHeight');
            } else {
                return;
            }

            anim = new Y.Anim({
                node: this.logs,
                easing: 'easeOut',
                duration: 0.3,
                from: {
                    scrollTop: logs.get('scrollTop')
                },
                to: {
                    scrollTop: toTop
                }
            });

            anim.on('end', this.updateScrollArrows, this);
            anim.run();
        }
    };

    Y.namespace('mojito.debug.console').Log = Log;
}, '0.0.1', {
    requires: [
        'node',
        'anim',
        'datatype-date',
        'mojito-debug-console-menu'
    ]
});

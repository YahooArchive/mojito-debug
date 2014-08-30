/*global YUI, localStorage */
YUI.add('mojito-debug-console-menu', function (Y, NAME) {
    'use strict';

    var MENU = '.debug-console-menu',
        GEAR_BUTTON = '.debug-console-menu-gear',
        CLOSE_BUTTON = '.debug-console-menu-close',
        CONSOLE_FORM = '.debug-console-console-form',
        YUI_FORM = '.debug-console-yui-form',
        OPEN_MENU_CLASS = 'debug-console-menu-open',
        SHOW_NUM_CLASS = 'debug-console-show-num',
        SHOW_TIME_CLASS = 'debug-console-show-time',
        LINE_WRAP_CLASS = 'debug-console-line-wrap',
        STATE_STORAGE = 'debug-console-state',
        DEFAULT_STATE = {
            enabled: false,
            showLineNumbers: false,
            showTimestamp: false,
            lineWrap: true
        };

    function Menu(node, mp) {
        this.node = node;
        this.mp = mp;
        this.menu = node.one(MENU);



        this.initMenuToggle();
        this.initState();
    }

    Menu.prototype = {
        initMenuToggle: function () {
            this.gearButton = this.node.one(GEAR_BUTTON);
            this.gearButton.on('click', this.open, this);

            this.closeButton = this.menu.one(CLOSE_BUTTON);
            this.closeButton.on('click', this.close, this);
        },

        initState: function () {
            var self = this,
                state;

            try {
                state = JSON.parse(localStorage.getItem(STATE_STORAGE)) || {};
            } catch (e) {
                state = {};
            }

            if (typeof localStorage === 'object') {
                window.addEventListener('unload', function () {
                    self.setConsoleOptions(true);
                    localStorage.setItem(STATE_STORAGE, JSON.stringify(state));
                });
            }

            state.enabled = this.mp.data.get('enabled');
            state.logLevel = this.mp.data.get('enabled');

            Y.mix(state, DEFAULT_STATE);
            this.state = state;
            this.setConsoleOptions();
            this.setYuiOptions();
        },

        setConsoleOptions: function (save) {
            var self = this,
                state = this.state,
                consoleForm = this.menu.one(CONSOLE_FORM);

            Y.Array.each(['enabled', 'showLineNumbers', 'showTimestamps', 'lineWrap'], function (name) {
                var option = consoleForm.get(name);
                if (save) {
                    state[name] = option.get('checked');
                } else {
                    option.set('checked', state[name]);
                }
            });

            if (!save) {
                (function () {
                    var enabledCheckBox = consoleForm.get('enabled'),
                        showLineNumbers = consoleForm.get('showLineNumbers'),
                        showTimestamps = consoleForm.get('showTimestamps'),
                        lineWrap = consoleForm.get('lineWrap');

                    function showLineNumbersFn() {
                        self.node[(showLineNumbers.get('checked') ? 'add' : 'remove') + 'Class'](SHOW_NUM_CLASS);
                    }
                    function showTimestampsFn() {
                        self.node[(showTimestamps.get('checked') ? 'add' : 'remove') + 'Class'](SHOW_TIME_CLASS);
                    }
                    function lineWrapFn() {
                        self.node[(lineWrap.get('checked') ? 'add' : 'remove') + 'Class'](LINE_WRAP_CLASS);
                    }
                    showLineNumbersFn();
                    showTimestampsFn();
                    lineWrapFn();
                    showLineNumbers.on('change', showLineNumbersFn);
                    showTimestamps.on('change', showTimestampsFn);
                    lineWrap.on('change', lineWrapFn);
                    enabledCheckBox.on('change', function () {
                        var enabled = enabledCheckBox.get('checked');
                        self.updateConsole({
                            enabled: enabled
                        }, function (error) {
                            if (error) {
                                Y.Debug.error('console', 'Unable to ' + (enabled ? 'enable' : 'disable') + ' console: ' + error, NAME);
                            }
                        });
                    });
                }());
            }
        },

        setYuiOptions: function () {
            var self = this,
                mp = this.mp,
                yuiForm = this.menu.one(YUI_FORM),
                logLevel = yuiForm.get('logLevel');
            logLevel.set('value', mp.data.get('logLevel'));
            yuiForm.on('change', function () {
                var newLogLevel = logLevel.get('value');
                if (newLogLevel) {
                    self.updateConsole({
                        logLevel: newLogLevel
                    }, function (error) {
                        if (error) {
                            Y.Debug.error('console', 'Unable to change logLevel to ' + newLogLevel + ': ' + error, NAME);
                        }
                    });
                }
            });
        },

        updateConsole: function (update, callback) {
            this.mp.invoke('updateConsole', {
                params: {
                    body: {
                        update: update
                    }
                }
            }, callback);
        },

        open: function () {
            this.node.addClass(OPEN_MENU_CLASS);
        },

        close: function () {
            this.node.removeClass(OPEN_MENU_CLASS);
        }
    };

    Y.namespace('mojito.debug.console').Menu = Menu;
}, '0.0.1', {
    requires: [
        'mojito-debug-addon'
    ]
});

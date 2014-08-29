/*jslint nomen: true, plusplus: true */
YUI.add('UsageBinderIndex', function (Y, NAME) {
    'use strict';

    var UPDATE_RATE = 1000,
        CPU_USAGE = '.debug-usage-cpu-usage',
        MEMORY_USAGE = '.debug-usage-memory-usage',
        HEAP_LIST = '.debug-usage-heap-list',
        HEAP_INFO = '.debug-usage-heap-info',
        HEAP_INFO_DATE = '.debug-usage-heap-date',
        HEAP_INFO_SIZE = '.debug-usage-heap-size',
        CREATE_BUTTON = '.debug-usage-create',
        DELETE_BUTTON = '.debug-usage-delete',
        INFO_TIME_INPUT = '.debug-usage-info-time',
        CREATING_HEAP_CLASS = 'creating-heap',
        DELETING_HEAP_CLASS = 'deleting-heap',
        DOWNLOADING_HEAP_CLASS = 'downloading-heap';

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mp) {
            this.mp = mp;
        },

        bind: function (node) {
            this.node = node;
            this.cpuUsage = node.one(CPU_USAGE);
            this.memoryUsage = node.one(MEMORY_USAGE);
            this.heapList = node.one(HEAP_LIST);
            this.heapInfo = node.one(HEAP_INFO);
            this.heapInfoDate = node.one(HEAP_INFO_DATE);
            this.heapInfoSize = node.one(HEAP_INFO_SIZE);

            this.heapList.on('change', this.updateHeapInfo, this);
            node.one(CREATE_BUTTON).on('click', this.createHeapDump, this);
            node.one(DELETE_BUTTON).on('click', this.deleteHeapDump, this);

            this.updateUsage(this.mp.data.get('usage'));
            this.initializeHeapDumps();
            this.updateHeapInfo();
        },

        initializeHeapDumps: function () {
            var self = this,
                heapDumps = self.mp.data.get('heapDumps');
            Y.Object.each(heapDumps, function (data) {
                self.addNewHeap(JSON.stringify(data));
            });
        },

        createHeapDump: function () {
            var self = this,
                node = this.node;

            node.addClass(CREATING_HEAP_CLASS);
            this.mp.invoke('createHeapDump', function (error, data, meta) {
                node.removeClass(CREATING_HEAP_CLASS);
                if (error) {
                    self.invokeError('Unable to create new heap dump', error);
                } else {
                    self.addNewHeap(data);
                }
            });
        },

        deleteHeapDump: function () {
            var self = this,
                selectedHeap = this.heapList.one('option:checked'),
                data = JSON.parse(selectedHeap.get('value')),
                node = this.node,
                heapInfo = this.heapInfo;

            node.addClass(DELETING_HEAP_CLASS);
            self.mp.invoke('deleteHeapDump', {
                params: {
                    body: {
                        time: data.time
                    }
                }
            }, function (error, data, meta) {
                node.removeClass(DELETING_HEAP_CLASS);
                if (error) {
                    self.invokeError('Unable to delete heap dump', error);
                }
                selectedHeap.remove();
                heapInfo.setStyle('display', 'none');
            });
        },

        addNewHeap: function (data) {
            var option = Y.Node.create('<option/>');
            option.set('value', data);

            data = JSON.parse(data);

            if (data.error) {
                Y.Debug.error('usage', 'Unable to add new heap dump: ' + data.error, NAME);
                return;
            }
            option.set('text', Y.Date.format(new Date(data.time), {format: '%Y-%m-%d %H:%M:%S'}));
            this.heapList.append(option);
        },

        updateHeapInfo: function () {
            var selectedHeap = this.heapList.one('option:checked'),
                data;
            if (selectedHeap) {
                data = JSON.parse(selectedHeap.get('value'));
                this.heapInfoDate.set('text', Y.Date.format(new Date(data.time), {format: '%a, %b %e, %Y %l:%M:%S %p'}));
                this.heapInfoSize.set('text', this._formatBytes(data.size));
                this.node.one(INFO_TIME_INPUT).set('value', data.time);

                this.heapInfo.setStyle('display', 'block');
            } else {
                this.heapInfo.setStyle('display', 'none');
            }
        },

        updateUsage: function (usage) {
            var self = this;

            self.cpuUsage.set('text', self._trunckateDecimals(usage.cpu, 2) + '%');
            self.memoryUsage.set('text', self._formatBytes(usage.memory, 2));

            setTimeout(function () {
                self.mp.invoke('updateUsage', function (error, usage, meta) {
                    if (error === 'Unexpected end of input') {
                        self.invokeError('Error updating usage information', error);
                        return;
                    }

                    self.updateUsage(usage);
                });
            }, UPDATE_RATE);
        },

        invokeError: function (message, error) {
            error = Y.Lang.isObject(error) ? 'error code ' + error.code : error;
            Y.Debug.error('usage', message + ': ' + error);
        },

        _formatBytes: function (bytes) {
            var units = [
                    'b',
                    'Kb',
                    'Mb',
                    'Gb',
                    'Tb'
                ],
                unit = 0;

            while (bytes > 1000 && unit < units.length - 1) {
                bytes /= 1024;
                unit++;
            }

            bytes = this._trunckateDecimals(bytes, 2);

            return bytes + ' ' + units[unit];
        },

        _trunckateDecimals: function (num, numDecimals) {
            var factor = Math.pow(10, numDecimals);
            return Math.floor(num * factor) / factor;
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'datatype-date'
    ]
});

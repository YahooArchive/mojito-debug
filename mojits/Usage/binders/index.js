/*jslint nomen: true, plusplus: true */
YUI.add('UsageBinderIndex', function (Y, NAME) {
    'use strict';

    var HEAP_LIST = '.debug-usage-heap-list',
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
            this.heapList = node.one(HEAP_LIST);
            this.heapInfo = node.one(HEAP_INFO);
            this.heapInfoDate = node.one(HEAP_INFO_DATE);
            this.heapInfoSize = node.one(HEAP_INFO_SIZE);

            this.heapList.on('change', this.updateHeapInfo, this);
            node.one(CREATE_BUTTON).on('click', this.createHeapDump, this);
            node.one(DELETE_BUTTON).on('click', this.deleteHeapDump, this);

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
                this.heapInfoSize.set('text', this.formatBytes(data.size));
                this.node.one(INFO_TIME_INPUT).set('value', data.time);

                this.heapInfo.setStyle('display', 'block');
            } else {
                this.heapInfo.setStyle('display', 'none');
            }
        },

        invokeError: function (message, error) {
            error = Y.Lang.isObject(error) ? 'error code ' + error.code : error;
            Y.Debug.error('usage', message + ': ' + error);
        },

        formatBytes: function (bytes) {
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

            // Limit to 2 decimal precision.
            bytes = (Math.floor(bytes * 100) / 100);

            return bytes + ' ' + units[unit];
        }
    };
}, '0.0.1', {
    requires: [
        'mojito-debug-addon',
        'datatype-date'
    ]
});

YUI.add('debug-tests', function (Y, NAME) {
 'use strict';

    var Assert = YUITest.Assert,
        suite = new YUITest.TestSuite(NAME);

    suite.add(new YUITest.TestCase({

        name: 'Waterfall unit tests',

        dummy: function (waterfallData) {
            Assert.isTrue(true);
        }
    }));

    YUITest.TestRunner.add(suite);
});

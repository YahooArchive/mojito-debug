/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*global YUI */

YUI.add('yahoo.utils.debug.json_tree.controller', function (Y, NAME) {
    'use strict';

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.mojito.controllers[NAME] = {

        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */
        index: function (ac) {
            ac.data.set('json', ac.params.getFromBody('json'));
            ac.data.set('options', ac.params.getFromBody('options'));
            ac.done();
        }
    };

}, '0.0.1', {
    requires: [
        'mojito-params-addon',
        'mojito-data-addon'
    ]
});

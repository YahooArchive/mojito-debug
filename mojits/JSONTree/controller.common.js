/*jslint anon:true, sloppy:true, nomen:true*/

/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
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

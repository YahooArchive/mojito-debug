/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint regexp: true, nomen: true, plusplus: true */
/*globals YUI, escape */

YUI.add('mojito-debug-utils', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.debug').Utils = {

        removeCycles: function (object, depthLimit, stringifyFunctions, acyclic) {
            depthLimit = depthLimit || -1;
            var _removeCycles = function (object, ancestors, path, depth) {

                if (typeof object !== 'object' || object === null) {
                    if (stringifyFunctions && Y.Lang.isFunction(object)) {
                        return object.toString();
                    }
                    return object;
                }

                if (depth === depthLimit) {
                    return '[' + (Y.Lang.isArray(object) ? 'Array[' + object.length + ']' :  object.constructor.name || 'Object') + ']';
                }

                if (!acyclic && ancestors.indexOf(object) !== -1) {
                    return '[Cycle: ' + path + ']';
                }

                var newObject = Y.Lang.isArray(object) ? [] : {},
                    newAncestors,
                    ret;

                if (!acyclic) {
                    newAncestors = ancestors.slice(0);
                    newAncestors.push(object);
                }

                Y.Object.each(object, function (value, key) {
                    var newValue = _removeCycles(value, !acyclic && newAncestors.slice(0), path + '->' + key, depth + 1);
                    if (newValue !== value) {
                        newObject[key] = newValue;
                    }
                });

                if (!Y.Object.isEmpty(newObject)) {
                    Y.mix(newObject, object);
                    ret = newObject;
                } else {
                    ret = object;
                }

                return ret;
            };
            return _removeCycles(object, [], 'root', 0);
        }
    };
}, '0.1.0');
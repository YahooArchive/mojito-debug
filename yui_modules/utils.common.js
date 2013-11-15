/*jslint regexp: true, nomen: true, plusplus: true, forin: true */
/*globals escape */

YUI.add('mojito-debug-utils', function (Y, NAME) {
    'use strict';

    var DEFAULT_DEPTH = 3;
    Y.namespace('mojito.debug').Utils = {

        // TODO: refactor, make sure it can handle arrays
        acyclicClone: function (object, depth) {
            var _clone = function (object, clonedObject, depth, visited) {
                var visitedCopy,
                    child,
                    key,
                    i;

                depth = depth === undefined || depth === null ? DEFAULT_DEPTH : depth;
                for (key in object) {

                    // sometimes fails due to accessibility
                    try {
                        child = object[key];
                    } catch (e) {
                        child = "[" + e.message + "]";
                    }
                    //key = escape(key); // objects such as ac sometimes have illegal characters in key, causing issues
                    if (typeof child === "object") {
                        if (depth === 0) {
                            clonedObject[key] = "[object]";
                        } else {
                            for (i = 0; i < visited.length; i++) {
                                if (visited[i].object === child) {
                                    clonedObject[key] = "[Cycle - " + visited[i].key + "]";
                                    break;
                                }
                            }

                            if (!clonedObject[key]) {
                                clonedObject[key] = {};
                                visitedCopy = [];
                                for (i = 0; i < visited.length; i++) {
                                    visitedCopy.push({object: visited[i].object, key: visited[i].key});
                                }
                                visitedCopy.push({object: child, key: key});
                                _clone(child, clonedObject[key], depth - 1, visitedCopy);
                            }
                        }

                    } else {
                        if (typeof child === "function") {
                            try {
                                // get function argument list
                                clonedObject[key] = "[function " + child.toString().match(/(\(.*?\))/)[1] + "]";
                            } catch (e2) {
                                clonedObject[key] = "[function]";
                            }
                        } else {
                            clonedObject[key] = escape(child);
                        }
                    }
                }
            }, clonedObject = {};

            _clone(object, clonedObject, depth, [{object: object, key: "root"}]);
            return clonedObject;
        }
    };
}, '0.1.0');
/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint regexp: true, nomen: true, plusplus: true, evil: true */
/*globals YUI, escape */

YUI.add('mojito-debug-utils', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.debug').Utils = {

        /*
         * decycle and retrocycle were derived from Douglas Crockford's JSON-js
         * https://github.com/douglascrockford/JSON-js
         */

        // Make a deep copy of an object or array, assuring that there is at most
        // one instance of each object or array in the resulting structure. The
        // duplicate references (which might be forming cycles) are replaced with
        // an object of the form
        //      {$ref: PATH}
        // where the PATH is a JSONPath string that locates the first occurance.
        // So,
        //      var a = [];
        //      a[0] = a;
        //      return JSON.stringify(JSON.decycle(a));
        // produces the string '[{"$ref":"$"}]'.

        // JSONPath is used to locate the unique object. $ indicates the top level of
        // the object or array. [NUMBER] or [STRING] indicates a child member or
        // property.
        decycle: function decycle(object) {

            var objects = [],   // Keep a reference to each unique object or array
                paths = [];     // Keep the path to each unique object or array

            // The derez recurses through the object, producing the deep copy.
            return (function derez(value, path) {

                var i,          // The loop counter
                    name,       // Property name
                    nu;         // The new object or array

                // typeof null === 'object', so go on if this value is really an object but not
                // one of the weird builtin objects.

                if (typeof value === 'object' && value !== null &&
                        !(value instanceof Boolean) &&
                        !(value instanceof Date)    &&
                        !(value instanceof Number)  &&
                        !(value instanceof RegExp)  &&
                        !(value instanceof String)) {

                    // If the value is an object or array, look to see if we have already
                    // encountered it. If so, return a $ref/path object. This is a hard way,
                    // linear search that will get slower as the number of unique objects grows.

                    for (i = 0; i < objects.length; i += 1) {
                        if (objects[i] === value) {
                            return {$ref: paths[i]};
                        }
                    }

                    // Otherwise, accumulate the unique value and its path.

                    objects.push(value);
                    paths.push(path);

                    // If it is an array, replicate the array.

                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        nu = [];
                        for (i = 0; i < value.length; i += 1) {
                            nu[i] = derez(value[i], path + '[' + i + ']');
                        }
                    } else {

                        // If it is an object, replicate the object.
                        nu = {};
                        for (name in value) {
                            if (Object.prototype.hasOwnProperty.call(value, name)) {
                                nu[name] = derez(value[name],
                                    path + '[' + JSON.stringify(name) + ']');
                            }
                        }
                    }
                    return nu;
                }

                // Stringify functions
                if (typeof value === 'function') {
                    value = value.toString();
                    return '[F' + value.substring(1, value.indexOf('{') - 1) + ']';
                }

                return value;
            }(object, '$'));
        },

        // Restore an object that was reduced by decycle. Members whose values are
        // objects of the form
        //      {$ref: PATH}
        // are replaced with references to the value found by the PATH. This will
        // restore cycles. The object will be mutated.

        // The eval function is used to locate the values described by a PATH. The
        // root object is kept in a $ variable. A regular expression is used to
        // assure that the PATH is extremely well formed. The regexp contains nested
        // * quantifiers. That has been known to have extremely bad performance
        // problems on some browsers for very long strings. A PATH is expected to be
        // reasonably short. A PATH is allowed to belong to a very restricted subset of
        // Goessner's JSONPath.

        // So,
        //      var s = '[{"$ref":"$"}]';
        //      return JSON.retrocycle(JSON.parse(s));
        // produces an array containing a single element which is the array itself.
        retrocycle: function retrocycle($) {

            var px =
                /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

            // The rez function walks recursively through the object looking for $ref
            // properties. When it finds one that has a value that is a path, then it
            // replaces the $ref object with a reference to the value that is found by
            // the path.
            (function rez(value) {
                var i, item, name, path;

                if (value && typeof value === 'object') {
                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        for (i = 0; i < value.length; i += 1) {
                            item = value[i];
                            if (item && typeof item === 'object') {
                                path = item.$ref;
                                if (typeof path === 'string' && px.test(path)) {
                                    value[i] = eval(path);
                                } else {
                                    rez(item);
                                }
                            }
                        }
                    } else {
                        for (name in value) {
                            if (typeof value[name] === 'object') {
                                item = value[name];
                                if (item) {
                                    path = item.$ref;
                                    if (typeof path === 'string' && px.test(path)) {
                                        value[name] = eval(path);
                                    } else {
                                        rez(item);
                                    }
                                }
                            }
                        }
                    }
                }
            }($));
            return $;
        },

        removeCycles: function (object, depthLimit) {
            if (depthLimit === undefined) {
                depthLimit = 4;
            }
            return this.transformObject(object, depthLimit, true, false, false);
        },

        transformObject: function (object, depthLimit, stringifyFunctions, copyMinimum, isAcyclic) {
            depthLimit = depthLimit || -1;
            var _transformObject = function (object, ancestors, path, depth) {
                var newObject = Y.Lang.isArray(object) ? [] : {},
                    newAncestors,
                    ret,
                    index = isAcyclic ? -1 : ancestors.indexOf(object);

                if (typeof object !== 'object' || object === null) {
                    if (stringifyFunctions !== false && Y.Lang.isFunction(object)) {
                        object = object.toString();
                        return '[F' + object.substring(1, object.indexOf('{') - 1) + ']';
                    }
                    return object;
                }

                if (depth === depthLimit) {
                    return '[' + (Y.Lang.isArray(object) ? 'Array[' + object.length + ']' :  object.constructor.name || 'Object') + ']';
                }

                if (index !== -1) {
                    return '[Cycle: ' + path.slice(0, index + 1).join('->') + ']';
                }

                if (!isAcyclic) {
                    newAncestors = ancestors.slice(0);
                    newAncestors.push(object);
                }

                Y.Object.each(object, function (value, key) {
                    var currentPath = path.slice(0),
                        newValue;

                    currentPath.push(key);
                    newValue = _transformObject(value, !isAcyclic && newAncestors.slice(0), currentPath, depth + 1);
                    if (copyMinimum && newValue !== value) {
                        newObject[key] = newValue;
                    } else if (!copyMinimum) {
                        newObject[key] = newValue;
                    }
                });

                if (copyMinimum) {
                    if (!Y.Object.isEmpty(newObject)) {
                        Y.mix(newObject, object);
                        ret = newObject;
                    } else {
                        ret = object;
                    }
                } else {
                    ret = newObject;
                }

                return ret;
            };
            return _transformObject(object, [], ['root'], 0);
        }
    };
}, '0.1.0');
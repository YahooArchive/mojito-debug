/*jslint regexp: true, nomen: true */
/*globals unescape */

YUI.add('mojito-debug-json-tree', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.debug').JSONTree = function (json, options) {

        var jsonTree = Y.Node.create("<div/>"),
            treeView;

        function buildTree(jsonObject) {

            var tree = [];

            function buildNode(jsonObject, treeChildren) {

                var key,
                    value,
                    treeNode,
                    keySpan,
                    valueSpan,
                    nodeHTML;

                for (key in jsonObject) {

                    if (jsonObject.hasOwnProperty(key)) {

                        treeNode = {
                            type: "html",
                            expanded: false
                        };

                        if (!jsonObject[key] || typeof jsonObject[key] !== "object") {
                            keySpan = Y.Node.create("<span class='key'>" + unescape(key) + ": </span>");
                            valueSpan = Y.Node.create("<span class='value'></span>");
                            value = jsonObject[key] === null || jsonObject[key] === undefined ? "[" + jsonObject[key] + "]" : unescape(jsonObject[key]);
                            valueSpan.set("text", value);
                            nodeHTML = Y.Node.create("<span></span>");
                            nodeHTML.append(keySpan);
                            nodeHTML.append(valueSpan);
                            treeNode.html = nodeHTML.get("innerHTML");
                        } else {
                            if (jsonObject[key] instanceof Array) {
                                treeNode.html = "<span class='key'>" + unescape(key) + " <span class='quantity'>(" + jsonObject[key].length + ")</span></span>";
                            } else if (Object.keys(jsonObject[key]).length === 0) {
                                treeNode.html = "<span class='key'>" + unescape(key) + ": </span><span class='value'>[empty]</span>";
                            } else {
                                treeNode.html = "<span class='key'>" + unescape(key) + "</span>";
                            }
                            treeNode.children = [];
                            buildNode(jsonObject[key], treeNode.children);
                        }
                        treeChildren.push(treeNode);
                    }
                }
            }

            buildNode(jsonObject, tree);

            return tree;
        }

        function addFilter(tree, ignoreCase) {

            var rootChildren = jsonTree.one(".ygtvchildren").all(">.ygtvitem"),
                searchFilterWidth = 110,
                searchFilter = Y.Node.create("<input class='filter' type='text' placeholder='Search' style='width:" + searchFilterWidth + "px'></input>"),
                searchFilterTd,
                filterTimeout,
                filterDelay = 300,
                initialized = false;

            function filter(node, filterStr, depth, treeNode) {
                var childrenContainer = node.one(".ygtvchildren"),
                    treeChildren = treeNode.children,
                    children = childrenContainer.all(">.ygtvitem"),
                    filterRegex = ignoreCase ? new RegExp(filterStr, "i") : new RegExp(filterStr),
                    key = node.one(".ygtvcontent").one(">.key"),
                    value = node.one(".ygtvcontent").one(">.value"),
                    thisMatchesFilter = false,
                    aChildMatchesFilter = false,
                    childMatchesFilter = false,
                    i;

                treeNode.expand();

                key = key ? key.get("innerHTML") : "";
                value = value ? value.get("innerHTML") : "";
                thisMatchesFilter = filterRegex.test(key) || filterRegex.test(value);

                // this is a leaf node
                if (children.size() === 0) {
                    if (thisMatchesFilter) {
                        node.show();
                    } else {
                        node.hide();
                    }
                    return thisMatchesFilter;
                }

                if (thisMatchesFilter) { // this is not a leaf node but it matches filter
                    treeNode.collapse();
                    treeNode.collapseAll();
                    return true;
                }

                children.each(function (child, childIndex) {
                    childMatchesFilter = filter(child, filterStr, depth + 1, treeChildren[childIndex]);
                    aChildMatchesFilter = aChildMatchesFilter || childMatchesFilter;
                    return false;
                });

                if (!thisMatchesFilter && !aChildMatchesFilter && depth !== 0) {
                    node.hide();
                }

                return thisMatchesFilter || aChildMatchesFilter;
            }

            function filterTree(filterStr) {
                // set cursor to wait
                document.body.style.cursor = "wait";
                searchFilter.setStyle("cursor", "wait");
                // make async so that cursor are shown
                setTimeout(function () {
                    jsonTree.one(".ygtvchildren").all(".ygtvitem").show();
                    var rootTreeChildren = tree.root.children;
                    rootChildren.each(function (child, childIndex) {
                        filter(child, filterStr, 0, rootTreeChildren[childIndex]);
                        return false;
                    });

                    // reset cursor
                    document.body.style.cursor = "auto";
                    searchFilter.setStyle("cursor", "text");
                }, 50);
            }

            // prevent node from expanding on enter pressed
            searchFilter.on("keydown", function (e) {
                if (e.keyCode === 13) {
                    e.stopPropagation();
                }
            });

            searchFilter.on("keyup", function (e) {
                var initialize = function (node) {
                        node.expand();
                        node.collapse();
                        Y.each(node.children, function (child) {
                            initialize(child);
                        });
                    },
                    filterValue = e.target.get('value');

                if (!initialized) {
                    tree.root.expand();
                    tree.root.collapse();
                    Y.each(tree.root.children, function (child) {
                        initialize(child);
                    });
                    initialized = true;
                }


                e.stopPropagation();
                e.cancelBubble = true;
                if (filterValue === "") {
                    tree.collapseAll();
                    jsonTree.one(".ygtvchildren").all(".ygtvitem").show();
                } else {
                    clearTimeout(filterTimeout);
                    // filter immediately if 'enter' pressed else delay
                    if (e.keyCode === 13) {
                        filterTree(filterValue);
                    } else {
                        filterTimeout = setTimeout(function () {
                            filterTree(e.target.get('value'));
                        }, filterDelay);
                    }
                }
            });

            // if only one child put filter to its right
            // else place it on top
            if (rootChildren.size() === 1) {
                searchFilterTd = Y.Node.create("<td width='" + (searchFilterWidth) + "px'></td>");
                searchFilter.setStyle("marginLeft", "6px");
                searchFilterTd.append(searchFilter);
                //searchFilter.setStyle("position", "absolute");
                jsonTree.one('.ygtvrow .ygtvcontent').set("padding-right", "6px");
                jsonTree.one('.ygtvrow').append(searchFilterTd);

            } else {
                searchFilter.setStyle("float", "left");
                jsonTree.insert(searchFilter, "before");
            }
        }

        function addText(jsonString) {
            var textTd = Y.Node.create("<td></td>"),
                textDiv = Y.Node.create("<div></div>"),
                textButton = Y.Node.create("<img title='Toggle JSON text, double click to open on new page' class='text_button' src='http://svn.corp.yahoo.com/docroot/images/log.png'></img>"),
                text = Y.Node.create("<textarea readonly style='position:absolute' class='hideable text' wrap='off'/>");

            text.set("text", jsonString);
            text.toggleView();
            text.hide();

            textButton.on("click", function (e) {
                text.toggleView();
            });

            textButton.on("dblclick", function (e) {
                var newWindow = window.open();
                newWindow.document.write("<pre>" + Y.Escape.html(jsonString) + "</pre>");
                newWindow.document.body.style.margin = 0;
                newWindow.document.close();
            });

            textDiv.append(textButton);
            textDiv.append(text);

            // if only one child put filter to its right
            // else place it on top
            if (jsonTree.one(".ygtvchildren").all(">.ygtvitem").size() === 1) {
                textTd.append(textDiv);
                //textDiv.setStyle("position", "absolute");
                jsonTree.one('.ygtvrow .ygtvcontent').set("padding-right", "6px");
                jsonTree.one('.ygtvrow').append(textTd);
            } else {
                textDiv.setStyle("float", "left");
                jsonTree.insert(textDiv, "before");
            }
        }

        function addOptions() {
            var jsonString;

            if (options && options.filter) {
                addFilter(treeView, !!options.filter.ignoreCase);
            }

            // add json text to tree if option enabled
            if (options && options.text) {
                jsonString = options.text.customText;
                if (jsonString === undefined) {
                    jsonString = JSON.stringify(json, function (key, value) {
                        if (typeof value === "string") {
                            return unescape(value);
                        }
                        return value;
                    }, options.text.tabWidth || 4);
                }
                addText(jsonString);
            }
        }

        this.get = function () {
            return jsonTree;
        };

        jsonTree.addClass("json_tree tree");

        // check if valid json object, if not just print object
        if (typeof json !== "object" || !json) {
            jsonTree.append("[" + String(json) + "]");
            return;
        }

        if (Y.Object.isEmpty(json)) {
            jsonTree.append("[Object is empty]");
            return;
        }

        // TODO: in order to ensure that different treeViews do not interfere with each other
        // the YUI object is stored to a global variable such that it is reused
        window.JSONTREE = window.JSONTREE || Y;

        // build and render json tree
        treeView = new window.JSONTREE.YUI2.widget.TreeView(jsonTree._node, buildTree(json));
        treeView.render();

        addOptions();
    };
}, '0.1.0', {requires: ['yui2-treeview', 'escape']});
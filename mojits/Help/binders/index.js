/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint plusplus: true */
/*global YUI */

YUI.add('mojito-debug-help-binder', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {

        bind: function (node) {
            var self = this,
                mode = Y.Debug.binder.history.get('mode'),
                hooks = Y.Debug.binder.history.get('hooks'),
                config = Y.Debug.binder.config;

            self.renderHelp(node, mode, hooks, config);

            Y.Debug.binder.history.after('change', function (e) {
                mode = e.newVal.mode;
                hooks = e.newVal.hooks;

                if (!Y.Object.isEmpty(hooks)) {
                    self.renderHelp(node, mode, hooks, config);
                }
            });
        },

        renderHelp: function (node, mode, hooks, config) {
            var self = this,
                i = 0,
                j = 0,
                aliasHook,
                sectionsNode = node.one('.debug-sections'),
                sections = {
                    Modes: {
                        Hide: {
                            mode: 'hide',
                            active: mode === 'hide',
                            description: 'Hides the application and only shows the debugger.'
                        },
                        JSON: {
                            mode: 'json',
                            active: mode === 'json',
                            description: 'Only show the JSON data of the debug hooks.'
                        }
                    },
                    Hooks: {},
                    Aliases: {}
                };

            sectionsNode.set('innerHTML', '');

            // Expand aliases
            while (i < hooks.length) {
                if (config.aliases[hooks[i]]) {
                    for (j = 0; j < config.aliases[hooks[i]].length; j++) {
                        hooks.unshift(config.aliases[hooks[i]][j]);
                        i++;
                    }
                }
                i++;
            }

            Y.Object.each(config.hooks, function (hookConfig, hookName) {
                sections.Hooks[hookConfig.title] = {
                    hook: hookName,
                    active: hooks.indexOf(hookName) !== -1,
                    description: hookConfig.description
                };
            });

            Y.Object.each(config.aliases, function (aliasHooks, alias) {
                sections.Aliases[alias[0].toUpperCase() + alias.substring(1)] = {
                    hook: alias,
                    active: hooks.indexOf(alias) !== -1,
                    description: 'Opens: ' + aliasHooks.join(', ')
                };
            });

            Y.Object.each(sections, function (section, sectionTitle) {
                sectionsNode.append(self.createSection(sectionTitle, section));
                sectionsNode.append('<br/>');
            });
        },

        createItem: function (title, item) {
            var self = this,
                itemNode = Y.Node.create('<ul/>').addClass('item'),
                closeButton = Y.Node.create('<li/>').addClass('close button').set('text', '(X)'),
                titleNode = Y.Node.create('<li/>').addClass('debug-title debug-link').set('text', title + ':').set('title', item.hook || item.mode),
                description = Y.Node.create('<li/>').addClass('description').set('text', item.description);

            if (item.active) {
                itemNode.addClass('active');
            }

            if (item.hook) {
                closeButton.on('click', function () {
                    Y.Debug.binder.removeHook(item.hook, 'anim');
                });

                titleNode.on('click', function () {
                    var hookContainer = Y.Debug.binder.hooks[item.hook] &&
                        Y.Debug.binder.hooks[item.hook].hookContainer;
                    Y.Debug.binder.addHook(item.hook, 'anim');
                    if (hookContainer) {
                        hookContainer.toggle('maximize');
                        new Y.Anim({
                            node: Y.one("body"),
                            easing: 'easeOut',
                            to: {
                                scrollLeft: hookContainer.getX(),
                                scrollTop: hookContainer.getY()
                            }
                        }).run();
                    }
                });
            } else if (item.mode) {
                closeButton.on('click', function () {
                    Y.Debug.binder.changeMode(null);
                });
                titleNode.on('click', function () {
                    if (!itemNode.hasClass('active')) {
                        Y.Debug.binder.changeMode(item.mode);
                    }
                });
            }

            itemNode.append(closeButton)
                .append(titleNode)
                .append(description);

            return itemNode;
        },

        createSection: function (title, section) {
            var self = this,
                sectionNode = Y.Node.create('<div/>'),
                titleNode = Y.Node.create('<div/>').addClass('debug-title').set('text', title),
                itemGroup = Y.Node.create('<ul/>').addClass('item-group');

            Y.Array.each(Y.Object.keys(section), function (itemTitle) {
                var item = section[itemTitle],
                    li = Y.Node.create('<li/>');
                li.append(self.createItem(itemTitle, item));
                itemGroup.append(li);
            });

            sectionNode.append(titleNode);
            sectionNode.append(itemGroup);

            return sectionNode;
        }
    };
}, '0.0.1', {
    requires: [
        'anim',
        'mojito-debug-addon'
    ]
});

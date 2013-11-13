YUI.add('mojito-debug-help-binder', function (Y, NAME) {
    'use strict';

    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            this.allHooks = mojitProxy.data.get('debugData').allHooks;
        },

        bind: function (node) {
            var self = this,
                mode = Y.Debug.binder.history.get('mode'),
                hooks = Y.Debug.binder.history.get('hooks');

            self.renderHelp(node, mode, hooks, self.allHooks);

            Y.Debug.binder.history.after('change', function (e) {
                mode = e.newVal.mode;
                hooks = e.newVal.hooks;

                self.renderHelp(node, mode, hooks, self.allHooks);
            });
        },

        renderHelp: function (node, mode, hooks, allHooks) {
            var self = this,
                sectionsNode = node.one('.sections'),
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
                    Hooks: {}
                };

            sectionsNode.set('innerHTML', '');

            Y.Object.each(allHooks, function (hookConfig, hookName) {
                sections.Hooks[hookConfig.title] = {
                    hook: hookName,
                    active: hooks.indexOf(hookName) !== -1,
                    description: hookConfig.description
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
                titleNode = Y.Node.create('<li/>').addClass('title link').set('text', title + ':'),
                description = Y.Node.create('<li/>').addClass('description').set('text', item.description);

            if (item.active) {
                itemNode.addClass('active');
            }

            if (item.hook) {
                closeButton.on('click', function () {
                    var hookContainer = Y.Debug.hookContainers[item.hook];
                    //itemNode.removeClass('active');
                    hookContainer.close();
                });

                titleNode.on('click', function () {
                    var hookContainer = Y.Debug.hookContainers[item.hook];
                    //itemNode.addClass('active');
                    if (!hookContainer) {
                        Y.Debug.binder.addHook(item.hook);
                    } else {
                        hookContainer.open();
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
                    //itemNode.removeClass('active');
                    Y.Debug.binder.changeMode(null);
                });
                titleNode.on('click', function () {
                    if (!itemNode.hasClass('active')) {
                        Y.Debug.binder.changeMode(item.mode);
                        /*(itemNode.ancestor('ul').all('.item').removeClass('active');
                        itemNode.addClass('active');*/
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
                titleNode = Y.Node.create('<div/>').addClass('title').set('text', title),
                itemGroup = Y.Node.create('<ul/>').addClass('item-group');

            Y.Array.each(Y.Object.keys(section).sort(), function (itemTitle) {
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

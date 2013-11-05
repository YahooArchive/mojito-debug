YUI.add('mojito-debug-hook-container', function (Y) {
    'use strict';
    var HookContainer = function (hookName, hook) {
        var title = hook.title || hookName,
            description = hook.description || hook.title,
            container = Y.Node.create('<div/>').addClass('hook-container').set('id', hookName + '-hook'),
            header = Y.Node.create('<div/>').addClass('header'),
            titleNode = Y.Node.create('<span/>').addClass('title').set('text', title),
            closeButton = Y.Node.create('<span/>').addClass('close button').set('text', 'x'),
            minimize = Y.Node.create('<span/>').addClass('minimize button').set('innerHTML', '&ndash;'),
            maximize = Y.Node.create('<span/>').addClass('maximize button').set('innerHTML', '&#9634;'),
            content = Y.Node.create('<div/>').addClass('content');

        closeButton.on('click', this.close);
        minimize.on('click', this.toggle);
        maximize.on('click', this.toggle);

        header.append(titleNode)
              .append(closeButton)
              .append(minimize)
              .append(maximize);

        container.append(header)
                 .append(content);

        Y.mix(container, HookContainer.prototype);
        container.content = content;

        if (hook) {
            container.update(hook);
        }

        return container;
    };

    HookContainer.prototype = {
        update: function (hook) {
            // certain hooks will specifically say to append instead of replace
            this.content.set('innerHTML', '');
            this.content.append(new Y.mojito.debug.GenericHook(hook.debugData));
        },

        close: function () {
            this.remove();
        },

        toggle: function () {
            this.toggleClass('minimized');
        }
    };

    Y.namespace('mojito.debug').HookContainer = HookContainer;
}, '0.0.1', {
    requires: [
        'mojito-debug-generic-hook'
    ]
});

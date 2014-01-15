/*
 * Copyright (c) 2013, Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*global YUI */

YUI.add('mojito-debug-hook-container', function (Y) {
    'use strict';
    var HookContainer = function (hookName, hook) {
        var title = hook.config.title,
            description = hook.config.description,
            node = Y.Node.create('<div/>').addClass('maximized hook-container').set('id', hookName + '-hook'),
            header = Y.Node.create('<div/>').addClass('header no-select'),
            titleNode = Y.Node.create('<span/>').addClass('title').set('text', title).set('title', description),
            closeButton = Y.Node.create('<span/>').addClass('close button').set('text', 'x'),
            minimize = Y.Node.create('<span/>').addClass('minimize button').set('innerHTML', '&ndash;'),
            maximize = Y.Node.create('<span/>').addClass('maximize button').set('innerHTML', '&#9634;'),
            contentWrapper = Y.Node.create('<div/>').addClass('content-wrapper').addClass(hook.config['class']);

        this.opened = true;
        this.maximized = true;
        this.contentWrapper = contentWrapper;
        this.hook = hookName;

        closeButton.on('click', function () {
            Y.Debug.binder.removeHook(hookName, true);
        });

        titleNode.on('click', function () {
            node.toggle();
        });

        minimize.on('click', function () {
            node.toggle();
        });

        maximize.on('click', function () {
            node.toggle();
        });

        header.append(titleNode)
              .append(closeButton)
              .append(minimize)
              .append(maximize);

        node.append(header)
                 .append(contentWrapper);

        Y.mix(node, this);
        Y.mix(node, HookContainer.prototype);

        if (hook) {
            node.update(hook);
        }

        return node;
    };

    HookContainer.prototype = {
        update: function (hook) {
            if (!this.hookContent) {
                this.hookContent = new Y.mojito.debug.HookContent();
                this.contentWrapper.append(this.hookContent);
            }

            this.hookContent.update(hook.debugData);
        },

        close: function (anim) {
            if (anim) {
                this.hide({duration: 0.2});
            } else {
                this.setStyle('opacity', 0)
                    .setStyle('display', 'none')
                    .set('hidden', true);
            }
            this.opened = false;
        },

        open: function (anim) {
            if (anim) {
                this.show({duration: 0.2});
            } else {
                this.setStyle('opacity', 1)
                    .setStyle('display', 'block')
                    .set('hidden', false);
            }
            this.opened = true;
        },

        toggle: function (state) {
            var prevState = this.maximized,
                contentWrapper = this.contentWrapper;
            if (!state) {
                this.maximized = !this.maximized;
            } else if (state === 'maximize') {
                this.maximized = true;
            } else {
                this.maximized = false;
            }

            if (prevState === this.maximized) {
                return;
            }

            if (this.maximized) {
                this.addClass('maximized');
            } else {
                this.removeClass('maximized');
            }

            if (!this.maximized) {
                // need to remove auto from height else it will close immediately
                contentWrapper.setStyle("height", contentWrapper.get("offsetHeight") + "px")
                              // When closed make sure overflowing content is not visible.
                              .setStyle('overflow', 'hidden');
            }

            contentWrapper.transition({
                easing: 'ease-out',
                duration: 0.3,
                height:  this.maximized ? contentWrapper.get("scrollHeight") + "px" : "0px"
            }, function () {
                // need to set height to auto in case content inside change size
                if (this.maximized) {
                    contentWrapper.setStyle("height", "auto")
                                  // When open allow overflow to show.
                                  .setStyle('overflow', 'visible');
                }
            }.bind(this));
        }
    };

    Y.namespace('mojito.debug').HookContainer = HookContainer;
}, '0.0.1', {
    requires: [
        'mojito-debug-hook-content',
        'transition'
    ]
});

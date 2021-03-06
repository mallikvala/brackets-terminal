/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets,  Mustache, window */

/** Simple extension that adds a "File > Hello World" menu item */
define(function (require, exports, module) {
    "use strict";


    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        PanelManager = brackets.getModule("view/PanelManager"),
        AppInit = brackets.getModule("utils/AppInit"),
        Strings = brackets.getModule("strings"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        Resizer = brackets.getModule("utils/Resizer"),
        panelTemplate = require("text!htmlContent/bottom-panel.html"),

        settings = require("src/settings"),
        toolbarManager = require("src/toolbarManager"),
        terminalManager = require("src/terminal")(),
        shortcut = require("src/shortcut")(terminalManager.command.bind(terminalManager));

    var $bashPanel;

    var TERMINAL_COMMAND_ID = "artoale.terminal.open";
    var TERMINAL_SETTINGS_COMMAND_ID = "artoale.terminal.settings";

    var _visible = false;

    var openTerminalCommand;

    function togglePanel(forceShow) {
        if (_visible && forceShow === 'show') {
            return;
        }
        if (!_visible && forceShow === 'close') {
            return;
        }
        if (!_visible) {
            Resizer.show($bashPanel);
            openTerminalCommand.setChecked(true);
            $bashPanel.find('.terminal').css('font-size', settings.get('fontSize'));
            _visible = true;
        } else {
            Resizer.hide($bashPanel);
            openTerminalCommand.setChecked(false);
            _visible = false;
        }
    }


    function renderHtml(html) {
        $bashPanel.find(".terminal-container")
            .empty()
            .append(html);
    }


    function resize() {
        if (_visible) {
            terminalManager.handleResize($bashPanel);
        }
    }

    function init() {
        var $terminal;
        toolbarManager.setStatus(toolbarManager.NOT_RUNNING);
        terminalManager.clear();
        terminalManager.startConnection('http://localhost:' + settings.get('port'));


        renderHtml('<div id="bash-console"></div>');

        $bashPanel.find(".close").on('click', function () {
            handleAction();
        });




        $bashPanel.find("#terminal-commands").on('click', 'a', function () {
            $terminal = $bashPanel.find('.terminal');
            var command = $(this).data('command'),
                fontsize = '';

            if(command && typeof shortcut[command] === 'function') {
                shortcut[command]();
                return;
            }

            var action = $(this).data('action');
            console.log('action', action);
            if (action && action === 'font-plus') {
                console.log('terminal', $terminal);
                fontsize = parseInt($terminal.css('font-size'), 10);
                fontsize += 1;
                settings.set('fontSize',fontsize);
                $terminal.css('font-size', fontsize + 'px');
                resize();
            } else if (action && action === 'font-minus') {
                fontsize = parseInt($terminal.css('font-size'), 10);
                fontsize = Math.max(fontsize - 1, 1);
                settings.set('fontSize',fontsize);
                $terminal.css('font-size', fontsize + 'px');
                resize();
            }
        });

    }

    function handleAction() {
        if (toolbarManager.status === toolbarManager.ACTIVE) {
            togglePanel();
            toolbarManager.setStatus(toolbarManager.NOT_ACTIVE);
            terminalManager.blur();
        } else if (toolbarManager.status === toolbarManager.NOT_ACTIVE) {
            togglePanel();
            resize();
            terminalManager.focus();
            toolbarManager.setStatus(toolbarManager.ACTIVE);
        } else if (toolbarManager.status === toolbarManager.NOT_CONNECTED || toolbarManager.status === toolbarManager.NOT_RUNNING) {
            console.log('NOT CONNECTED ACTION');
            init();
        } else if (toolbarManager.status === toolbarManager.CONNECTED) {
            console.log('CONNECTED ACTION');
            //manca un terminale vero e proprio?
            terminalManager.createTerminal();
        } else if (toolbarManager.status === toolbarManager.ERROR) {
            console.log('ERROR ACTION');
            //Nulla da fare, siamo nella cacca
        }
    }

    var first = true;
    var killed = false;

    AppInit.htmlReady(function () {
        ExtensionUtils.loadStyleSheet(module, "terminal.css");
        // package-style naming to avoid collisions
        openTerminalCommand = CommandManager.register("Show terminal", TERMINAL_COMMAND_ID, function () {
            handleAction();
        });

        CommandManager.register("Brackets terminal settings", TERMINAL_SETTINGS_COMMAND_ID, function () {
            settings.showDialog();
        });



        Mustache.render(panelTemplate, Strings);
        PanelManager.createBottomPanel("bash.terminal", $(panelTemplate), 100);

        $bashPanel = $('#brackets-terminal');


        //        $(window).resize(function () {
        //            if (this.resizeTO) {
        //                window.clearTimeout(this.resizeTO);
        //            }
        //            this.resizeTO = window.setTimeout(resize, 200);
        //        });
        $('#sidebar').on('panelResizeEnd', resize);
        $bashPanel.on('panelResizeEnd', resize);
        $(terminalManager).on('connected', function () {
            toolbarManager.setStatus(toolbarManager.CONNECTED);
            $(terminalManager).on('disconnected', function () {
                toolbarManager.setStatus(toolbarManager.NOT_CONNECTED);
            });
        });

        $(terminalManager).on('notConnected', function () {
            toolbarManager.setStatus(toolbarManager.NOT_RUNNING);
        });

        $(terminalManager).on('killed', function () {
            //ctrl+d or exit\n triggered terminal close
            killed = true;
            toolbarManager.setStatus(toolbarManager.CONNECTED);
            togglePanel('close');
        });
        $(terminalManager).on('created', function () {
            if (first) {
                terminalManager.open($bashPanel.find('#bash-console').get()[0]);
                first = false;
            }
            toolbarManager.setStatus(toolbarManager.NOT_ACTIVE);
            if (killed) {
                killed = false;
                handleAction();
            }
        });



        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(TERMINAL_COMMAND_ID, "Ctrl-Shift-P");
        menu.addMenuItem(TERMINAL_SETTINGS_COMMAND_ID);



        toolbarManager.createIcon();
        $(toolbarManager).click(handleAction);

        init();

    });

});

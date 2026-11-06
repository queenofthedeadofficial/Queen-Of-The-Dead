//=============================================================================
// Andrew_ExitGameOption.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_ExitGameOption = true;

var Andrew = Andrew || {};
Andrew.ExitGameOption = Andrew.ExitGameOption || {};
Andrew.ExitGameOption.version = 1.01;

//=============================================================================
/*:
 * @plugindesc v1.01 Adds an "Exit Game" option to the bottom of the title
 * screen command list, with a Yes/No confirmation.
 * @author Andrew
 *
 * @param Command Name
 * @type string
 * @desc Text shown for the new title screen command.
 * @default Exit Game
 *
 * @param Confirm Text
 * @type string
 * @desc Text shown in the confirmation message box.
 * @default Exit the game?
 *
 * @param Yes Text
 * @type string
 * @desc Text for the confirmation's "Yes" choice.
 * @default Yes
 *
 * @param No Text
 * @type string
 * @desc Text for the confirmation's "No" choice.
 * @default No
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Adds "Exit Game" as the last command on the title screen. Selecting it
 * shows a message box with the confirm text, plus a Yes/No choice window.
 *
 * - OK on Yes: closes the game (SceneManager.exit(), falling back to
 *   nw.gui App.quit() or window.close() if that's ever unavailable).
 * - OK on No: closes the confirmation and returns to the title command
 *   window, cursor still on Exit Game.
 * - Cancel button while the choice window is active: same as No.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.01:
 * - Fixed "this.calcWindowHeight is not a function" on the title screen.
 *   calcWindowHeight is a Scene_MenuBase method; Scene_Title extends
 *   Scene_Base directly and never has it. Replaced with a height computed
 *   straight from Window_Base.prototype.fittingHeight(), which works
 *   regardless of scene base class (and still picks up any line-height /
 *   padding changes made by YEP_CoreEngine, since fittingHeight reads
 *   those through this.lineHeight()/this.standardPadding()).
 *
 * Version 1.00:
 * - Finished plugin.
 */
//=============================================================================

(function() {

'use strict';

var pluginName = (function() {
  var src = (document.currentScript && document.currentScript.src) || '';
  var file = decodeURIComponent(src.split('/').pop() || '');
  return file.replace(/\.js$/i, '') || 'Andrew_ExitGameOption';
})();

var params = PluginManager.parameters(pluginName) || {};
Andrew.ExitGameOption.commandName = String(params['Command Name'] || 'Exit Game');
Andrew.ExitGameOption.confirmText = String(params['Confirm Text'] || 'Exit the game?');
Andrew.ExitGameOption.yesText = String(params['Yes Text'] || 'Yes');
Andrew.ExitGameOption.noText = String(params['No Text'] || 'No');

//=============================================================================
// Window_TitleCommand
//=============================================================================

Andrew.ExitGameOption.Window_TitleCommand_makeCommandList =
    Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList = function() {
    Andrew.ExitGameOption.Window_TitleCommand_makeCommandList.call(this);
    this.addCommand(Andrew.ExitGameOption.commandName, 'exitGame');
};

//=============================================================================
// Window_ExitGameMessage
//=============================================================================

function Window_ExitGameMessage() {
    this.initialize.apply(this, arguments);
}

Window_ExitGameMessage.prototype = Object.create(Window_Base.prototype);
Window_ExitGameMessage.prototype.constructor = Window_ExitGameMessage;

Window_ExitGameMessage.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
};

Window_ExitGameMessage.prototype.refresh = function() {
    this.contents.clear();
    this.drawText(Andrew.ExitGameOption.confirmText, 0, 0,
        this.contentsWidth(), 'center');
};

//=============================================================================
// Window_ExitGameChoice
//=============================================================================

function Window_ExitGameChoice() {
    this.initialize.apply(this, arguments);
}

Window_ExitGameChoice.prototype = Object.create(Window_Command.prototype);
Window_ExitGameChoice.prototype.constructor = Window_ExitGameChoice;

Window_ExitGameChoice.prototype.initialize = function(x, y) {
    Window_Command.prototype.initialize.call(this, x, y);
};

Window_ExitGameChoice.prototype.windowWidth = function() {
    return 240;
};

Window_ExitGameChoice.prototype.makeCommandList = function() {
    this.addCommand(Andrew.ExitGameOption.yesText, 'yes');
    this.addCommand(Andrew.ExitGameOption.noText, 'no');
};

//=============================================================================
// Scene_Title
//=============================================================================

Andrew.ExitGameOption.Scene_Title_createCommandWindow =
    Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function() {
    Andrew.ExitGameOption.Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler('exitGame', this.commandExitGame.bind(this));
    this.createExitGameWindows();
};

Scene_Title.prototype.createExitGameWindows = function() {
    var messageWidth = 400;
    var messageHeight = this.exitGameMessageHeight();
    var messageX = (Graphics.boxWidth - messageWidth) / 2;
    var messageY = (Graphics.boxHeight - messageHeight) / 2 - 60;

    this._exitGameMessageWindow =
        new Window_ExitGameMessage(messageX, messageY, messageWidth, messageHeight);
    this._exitGameMessageWindow.hide();
    this.addWindow(this._exitGameMessageWindow);

    this._exitGameChoiceWindow = new Window_ExitGameChoice(0, 0);
    this._exitGameChoiceWindow.x =
        (Graphics.boxWidth - this._exitGameChoiceWindow.width) / 2;
    this._exitGameChoiceWindow.y = messageY + messageHeight + 8;
    this._exitGameChoiceWindow.setHandler('yes', this.onExitGameYes.bind(this));
    this._exitGameChoiceWindow.setHandler('no', this.onExitGameNo.bind(this));
    this._exitGameChoiceWindow.setHandler('cancel', this.onExitGameNo.bind(this));
    this._exitGameChoiceWindow.hide();
    this._exitGameChoiceWindow.deactivate();
    this.addWindow(this._exitGameChoiceWindow);
};

// calcWindowHeight is a Scene_MenuBase method -- Scene_Title extends
// Scene_Base directly and doesn't have it. fittingHeight() itself is a
// Window_Base method, so borrow it unbound off the prototype instead; it
// only reads this.lineHeight()/this.standardPadding(), both of which are
// plain constant-returning functions (still correct even if YEP_CoreEngine
// has changed those values via its own parameters).
Scene_Title.prototype.exitGameMessageHeight = function() {
    return Window_Base.prototype.fittingHeight.call(Window_Base.prototype, 1);
};

Scene_Title.prototype.commandExitGame = function() {
    this._commandWindow.deactivate();
    this._exitGameMessageWindow.show();
    this._exitGameChoiceWindow.select(0);
    this._exitGameChoiceWindow.show();
    this._exitGameChoiceWindow.activate();
};

Scene_Title.prototype.onExitGameYes = function() {
    if (typeof SceneManager.exit === 'function') {
        SceneManager.exit();
    } else if (Utils.isNwjs()) {
        require('nw.gui').App.quit();
    } else {
        window.close();
    }
};

Scene_Title.prototype.onExitGameNo = function() {
    this._exitGameChoiceWindow.deactivate();
    this._exitGameChoiceWindow.hide();
    this._exitGameMessageWindow.hide();
    this._commandWindow.activate();
};

})();
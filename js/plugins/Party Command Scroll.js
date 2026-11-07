/*:
 * @plugindesc Makes the Party Command window scroll when there are too many commands.
 * @author ChatGPT
 */

(function() {

"use strict";

// Match the visible rows used by actor commands.
Window_PartyCommand.prototype.numVisibleRows = function() {
    return 4;
};

// Allow cursor movement to scroll through additional commands.
Window_PartyCommand.prototype.maxCols = function() {
    return 1;
};

// Recreate the window with the proper height.
const _Scene_Battle_createPartyCommandWindow =
    Scene_Battle.prototype.createPartyCommandWindow;

Scene_Battle.prototype.createPartyCommandWindow = function() {
    if (this._partyCommandWindow) {
        this.removeChild(this._partyCommandWindow);
    }

    var y = Graphics.boxHeight - Window_PartyCommand.prototype.windowHeight();
    this._partyCommandWindow = new Window_PartyCommand();
    this._partyCommandWindow.y = y;

    this._partyCommandWindow.setHandler(
        'fight',
        this.commandFight.bind(this)
    );
    this._partyCommandWindow.setHandler(
        'escape',
        this.commandEscape.bind(this)
    );

    this.addWindow(this._partyCommandWindow);
};

})();
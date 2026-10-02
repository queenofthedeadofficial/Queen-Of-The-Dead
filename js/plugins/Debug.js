/*:
 * @plugindesc Scrollable Choice List Debug — logs hooks to diagnose timing and flag leaks
 * @author You
 *
 * @help
 * Use EnableChoiceScroll N then Show Choices. Paste console output here.
 */

(function() {
"use strict";

let pendingScroll = false;
let pendingRows = 6;

const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === "EnableChoiceScroll") {
        pendingScroll = true;
        pendingRows = Number(args[0]) || 6;
        console.log("[ChoiceDebug] PluginCommand EnableChoiceScroll -> pendingScroll:", pendingScroll, "pendingRows:", pendingRows);
    } else if (command === "DisableChoiceScroll") {
        pendingScroll = false;
        console.log("[ChoiceDebug] PluginCommand DisableChoiceScroll -> pendingScroll:", pendingScroll);
    }
};

// Hook setChoices (where choices are normally created)
const _Game_Message_setChoices = Game_Message.prototype.setChoices;
Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
    console.log("[ChoiceDebug] Game_Message.setChoices called. pendingScroll:", pendingScroll, "pendingRows:", pendingRows);
    this._choiceScrollEnabled = !!pendingScroll;
    if (pendingScroll) {
        this._choiceScrollRows = pendingRows;
    } else {
        delete this._choiceScrollRows;
    }
    console.log("[ChoiceDebug] Applied to $gameMessage -> _choiceScrollEnabled:", this._choiceScrollEnabled, "_choiceScrollRows:", this._choiceScrollRows);
    pendingScroll = false;
    _Game_Message_setChoices.call(this, choices, defaultType, cancelType);
};

// Clear flags when message cleared (defensive)
const _Game_Message_clear = Game_Message.prototype.clear;
Game_Message.prototype.clear = function() {
    if (this._choiceScrollEnabled || this._choiceScrollRows) {
        console.log("[ChoiceDebug] Game_Message.clear clearing flags. before:", this._choiceScrollEnabled, this._choiceScrollRows);
    }
    this._choiceScrollEnabled = false;
    delete this._choiceScrollRows;
    _Game_Message_clear.call(this);
};

// numVisibleRows logging
const _Window_ChoiceList_numVisibleRows = Window_ChoiceList.prototype.numVisibleRows;
Window_ChoiceList.prototype.numVisibleRows = function() {
    const enabled = $gameMessage && $gameMessage._choiceScrollEnabled;
    const rows = $gameMessage && $gameMessage._choiceScrollRows;
    console.log("[ChoiceDebug] numVisibleRows called. enabled:", enabled, "rows:", rows);
    if (enabled) {
        const val = Math.min(this.maxItems(), rows || 6);
        console.log("[ChoiceDebug] numVisibleRows ->", val);
        return val;
    }
    return _Window_ChoiceList_numVisibleRows.call(this);
};

// initialize logging and ensure _scrollY exists early
const _Window_ChoiceList_initialize = Window_ChoiceList.prototype.initialize;
Window_ChoiceList.prototype.initialize = function(messageWindow) {
    this._scrollY = 0;
    console.log("[ChoiceDebug] Window_ChoiceList.initialize _scrollY set to 0 before original initialize");
    _Window_ChoiceList_initialize.call(this, messageWindow);
};

// start / refresh logging
const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
Window_ChoiceList.prototype.start = function() {
    this._scrollY = 0;
    console.log("[ChoiceDebug] Window_ChoiceList.start reset _scrollY to 0");
    _Window_ChoiceList_start.call(this);
};

const _Window_ChoiceList_refresh = Window_ChoiceList.prototype.refresh;
Window_ChoiceList.prototype.refresh = function() {
    console.log("[ChoiceDebug] Window_ChoiceList.refresh called. _scrollY:", this._scrollY, "$gameMessage flags:", $gameMessage && $gameMessage._choiceScrollEnabled, $gameMessage && $gameMessage._choiceScrollRows);
    _Window_ChoiceList_refresh.call(this);
};

// updateCursor logging
const _Window_ChoiceList_updateCursor = Window_ChoiceList.prototype.updateCursor;
Window_ChoiceList.prototype.updateCursor = function() {
    _Window_ChoiceList_updateCursor.call(this);
    if ($gameMessage && $gameMessage._choiceScrollEnabled) {
        console.log("[ChoiceDebug] updateCursor -> ensureCursorVisible");
        this.ensureCursorVisible();
    }
};

// drawItem logging and safe draw
const _Window_ChoiceList_drawItem = Window_ChoiceList.prototype.drawItem;
Window_ChoiceList.prototype.drawItem = function(index) {
    console.log("[ChoiceDebug] drawItem index:", index, "scrollEnabled:", $gameMessage && $gameMessage._choiceScrollEnabled, "_scrollY:", this._scrollY);
    if (!($gameMessage && $gameMessage._choiceScrollEnabled)) {
        return _Window_ChoiceList_drawItem.call(this, index);
    }

    const rect = this.itemRect(index);
    const topY = this._scrollY;
    const bottomY = topY + this.numVisibleRows() * this.itemHeight();

    console.log("[ChoiceDebug] drawItem rect.y:", rect.y, "rect.h:", rect.height, "topY:", topY, "bottomY:", bottomY);

    if (rect.y + rect.height < topY) {
        console.log("[ChoiceDebug] drawItem skipped (above)");
        return;
    }
    if (rect.y > bottomY) {
        console.log("[ChoiceDebug] drawItem skipped (below)");
        return;
    }

    this.contents.save();
    this.contents.translate(0, -this._scrollY);
    _Window_ChoiceList_drawItem.call(this, index);
    this.contents.restore();
    console.log("[ChoiceDebug] drawItem drawn with translate");
};

// cleanup logging
function clearChoiceScrollFlags() {
    if ($gameMessage) {
        console.log("[ChoiceDebug] clearChoiceScrollFlags called. before:", $gameMessage._choiceScrollEnabled, $gameMessage._choiceScrollRows);
        $gameMessage._choiceScrollEnabled = false;
        delete $gameMessage._choiceScrollRows;
    }
}

const _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
Window_ChoiceList.prototype.callOkHandler = function() {
    console.log("[ChoiceDebug] callOkHandler");
    clearChoiceScrollFlags();
    _Window_ChoiceList_callOkHandler.call(this);
};

const _Window_ChoiceList_callCancelHandler = Window_ChoiceList.prototype.callCancelHandler;
Window_ChoiceList.prototype.callCancelHandler = function() {
    console.log("[ChoiceDebug] callCancelHandler");
    clearChoiceScrollFlags();
    _Window_ChoiceList_callCancelHandler.call(this);
};

const _Window_ChoiceList_close = Window_ChoiceList.prototype.close;
Window_ChoiceList.prototype.close = function() {
    console.log("[ChoiceDebug] close");
    clearChoiceScrollFlags();
    _Window_ChoiceList_close.call(this);
};

})();

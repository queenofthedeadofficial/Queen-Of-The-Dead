/*:
 * @plugindesc Scrollable Choice List Robust Patch - tries bitmap, canvas, or sprite translation fallbacks
 * @author You
 *
 * @help
 * Use plugin command:
 *   EnableChoiceScroll N
 *   DisableChoiceScroll
 * Place this plugin below YEP and other message/choice plugins.
 */

(function() {
"use strict";

// Pending state for next choice list
let pendingScroll = false;
let pendingRows = 6;

// Plugin commands
const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === "EnableChoiceScroll") {
        pendingScroll = true;
        pendingRows = Number(args[0]) || 6;
    } else if (command === "DisableChoiceScroll") {
        pendingScroll = false;
    }
};

// Apply flags when choices are created (reliable hook)
const _Game_Message_setChoices = Game_Message.prototype.setChoices;
Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
    this._choiceScrollEnabled = !!pendingScroll;
    if (pendingScroll) {
        this._choiceScrollRows = pendingRows;
    } else {
        delete this._choiceScrollRows;
    }
    pendingScroll = false;
    _Game_Message_setChoices.call(this, choices, defaultType, cancelType);
};

// Defensive clear when message cleared
const _Game_Message_clear = Game_Message.prototype.clear;
Game_Message.prototype.clear = function() {
    this._choiceScrollEnabled = false;
    delete this._choiceScrollRows;
    _Game_Message_clear.call(this);
};

// numVisibleRows uses applied flags
const _Window_ChoiceList_numVisibleRows = Window_ChoiceList.prototype.numVisibleRows;
Window_ChoiceList.prototype.numVisibleRows = function() {
    if ($gameMessage && $gameMessage._choiceScrollEnabled) {
        return Math.min(this.maxItems(), $gameMessage._choiceScrollRows || 6);
    }
    return _Window_ChoiceList_numVisibleRows.call(this);
};

// Ensure _scrollY exists before original initialize runs
const _Window_ChoiceList_initialize = Window_ChoiceList.prototype.initialize;
Window_ChoiceList.prototype.initialize = function(messageWindow) {
    this._scrollY = 0;
    _Window_ChoiceList_initialize.call(this, messageWindow);
};

// Reset scroll on start
const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
Window_ChoiceList.prototype.start = function() {
    this._scrollY = 0;
    _Window_ChoiceList_start.call(this);
};

// Defensive refresh
const _Window_ChoiceList_refresh = Window_ChoiceList.prototype.refresh;
Window_ChoiceList.prototype.refresh = function() {
    if (!($gameMessage && $gameMessage._choiceScrollEnabled)) {
        this._scrollY = 0;
    }
    _Window_ChoiceList_refresh.call(this);
};

// Cursor scrolling
const _Window_ChoiceList_updateCursor = Window_ChoiceList.prototype.updateCursor;
Window_ChoiceList.prototype.updateCursor = function() {
    _Window_ChoiceList_updateCursor.call(this);
    if ($gameMessage && $gameMessage._choiceScrollEnabled) {
        this.ensureCursorVisible();
    }
};

Window_ChoiceList.prototype.ensureCursorVisible = function() {
    const row = this.index();
    const topRow = Math.floor((this._scrollY || 0) / this.itemHeight());
    const bottomRow = topRow + this.numVisibleRows() - 1;
    if (row < topRow) {
        this._scrollY = row * this.itemHeight();
    } else if (row > bottomRow) {
        this._scrollY = (row - this.numVisibleRows() + 1) * this.itemHeight();
    }
};

// Robust drawItem with three translation strategies
const _Window_ChoiceList_drawItem = Window_ChoiceList.prototype.drawItem;
Window_ChoiceList.prototype.drawItem = function(index) {
    if (!($gameMessage && $gameMessage._choiceScrollEnabled)) {
        return _Window_ChoiceList_drawItem.call(this, index);
    }

    const rect = this.itemRect(index);
    const topY = this._scrollY || 0;
    const bottomY = topY + this.numVisibleRows() * this.itemHeight();

    if (rect.y + rect.height < topY) return;
    if (rect.y > bottomY) return;

    // Strategy 1: Bitmap helpers (standard)
    if (this.contents && typeof this.contents.save === "function") {
        this.contents.save();
        this.contents.translate(0, -topY);
        _Window_ChoiceList_drawItem.call(this, index);
        this.contents.restore();
        return;
    }

    // Strategy 2: Raw canvas context
    const ctx = this.contents && (this.contents._context || this.contents.context);
    if (ctx && typeof ctx.save === "function") {
        ctx.save();
        ctx.translate(0, -topY);
        _Window_ChoiceList_drawItem.call(this, index);
        ctx.restore();
        return;
    }

    // Strategy 3: Translate the window's contents sprite if available
    // This works when plugins replace contents but still use a sprite for rendering.
    const sprite = this._windowContentsSprite;
    if (sprite && typeof sprite.y === "number") {
        const prevY = sprite.y;
        sprite.y = prevY - topY;
        try {
            _Window_ChoiceList_drawItem.call(this, index);
        } finally {
            sprite.y = prevY;
        }
        return;
    }

    // Last resort: call original to avoid crash (may draw outside viewport)
    _Window_ChoiceList_drawItem.call(this, index);
};

// Cleanup flags in multiple places to avoid leaks
function clearChoiceScrollFlags() {
    if ($gameMessage) {
        $gameMessage._choiceScrollEnabled = false;
        delete $gameMessage._choiceScrollRows;
    }
}

const _Window_ChoiceList_callOkHandler = Window_ChoiceList.prototype.callOkHandler;
Window_ChoiceList.prototype.callOkHandler = function() {
    clearChoiceScrollFlags();
    _Window_ChoiceList_callOkHandler.call(this);
};

const _Window_ChoiceList_callCancelHandler = Window_ChoiceList.prototype.callCancelHandler;
Window_ChoiceList.prototype.callCancelHandler = function() {
    clearChoiceScrollFlags();
    _Window_ChoiceList_callCancelHandler.call(this);
};

const _Window_ChoiceList_close = Window_ChoiceList.prototype.close;
Window_ChoiceList.prototype.close = function() {
    clearChoiceScrollFlags();
    _Window_ChoiceList_close.call(this);
};

})();

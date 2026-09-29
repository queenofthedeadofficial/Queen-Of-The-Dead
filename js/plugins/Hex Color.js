/*:
 * @plugindesc Guaranteed Hex Colors for MV + Hime Large Choices (no escape dependency)
 * @author ChatGPT
 */

(function() {

    // -------------------------------------------------------------
    // HEX STATE STACK (per window instance safe)
    // -------------------------------------------------------------
    const _Window_Base_initialize = Window_Base.prototype.initialize;
    Window_Base.prototype.initialize = function() {
        _Window_Base_initialize.call(this);
        this._hexColorStack = [];
    };

    // -------------------------------------------------------------
    // APPLY COLOR DIRECTLY DURING DRAW (NO ESCAPE SYSTEM)
    // -------------------------------------------------------------
    function applyHexColor(window, text) {
        return text.replace(/\\hc\[(#[0-9a-fA-F]{6})\]/g, function(_, hex) {
            return '\x1bHC' + hex;
        }).replace(/\\hc/g, '\x1bHCR');
    }

    // -------------------------------------------------------------
    // OVERRIDE drawTextEx (primary pipeline)
    // -------------------------------------------------------------
    const _drawTextEx = Window_Base.prototype.drawTextEx;

    Window_Base.prototype.drawTextEx = function(text, x, y) {
        if (typeof text === 'string') {
            text = applyHexColor(this, text);
        }
        return _drawTextEx.call(this, text, x, y);
    };

    // -------------------------------------------------------------
    // CRITICAL: FORCE CHOICE LIST SUPPORT (HIME FIX)
    // -------------------------------------------------------------
    const _drawItem = Window_ChoiceList.prototype.drawItem;

    if (Window_ChoiceList && Window_ChoiceList.prototype.drawItem) {
        Window_ChoiceList.prototype.drawItem = function(index) {
            const text = this.commandName(index);
            const converted = applyHexColor(this, text);

            const rect = this.itemRectForText(index);
            this.resetTextColor();
            this.drawTextEx(converted, rect.x, rect.y);

        };
    }

    // -------------------------------------------------------------
    // HEX PROCESSING (DIRECT, NOT ESCAPE-DEPENDENT)
    // -------------------------------------------------------------
    const _processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;

    Window_Base.prototype.processEscapeCharacter = function(code, textState) {

        if (code === 'HC') {
            const hex = textState.text.slice(textState.index, textState.index + 7);
            this.changeTextColor(hex);
            textState.index += 7;
            return;
        }

        if (code === 'HCR') {
            this.resetTextColor();
            return;
        }

        _processEscapeCharacter.call(this, code, textState);
    };

})();
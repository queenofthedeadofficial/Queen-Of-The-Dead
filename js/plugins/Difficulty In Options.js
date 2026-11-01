/*:
 * @plugindesc v1.0 Adds a Difficulty option to the Options menu using Switch 4991.
 * @author ChatGPT
 *
 * @help
 * Difficulty:
 *   Easy = Switch 4991 ON
 *   Hard = Switch 4991 OFF
 *
 * Selecting the option and pressing OK toggles the difficulty.
 * Left/Right also toggle it.
 */

(function() {

    var DIFFICULTY_SYMBOL = 'difficulty';
    var DIFFICULTY_SWITCH = 4991;

    //--------------------------------------------------------------------------
    // Add command at bottom of options list
    //--------------------------------------------------------------------------

    var _Window_Options_makeCommandList =
        Window_Options.prototype.makeCommandList;

    Window_Options.prototype.makeCommandList = function() {
        _Window_Options_makeCommandList.call(this);
        this.addCommand('Difficulty', DIFFICULTY_SYMBOL);
    };

    //--------------------------------------------------------------------------
    // Display text
    //--------------------------------------------------------------------------

    var _Window_Options_statusText =
        Window_Options.prototype.statusText;

    Window_Options.prototype.statusText = function(index) {
        var symbol = this.commandSymbol(index);

        if (symbol === DIFFICULTY_SYMBOL) {
            return $gameSwitches.value(DIFFICULTY_SWITCH)
                ? 'Easy'
                : 'Hard';
        }

        return _Window_Options_statusText.call(this, index);
    };

    //--------------------------------------------------------------------------
    // Toggle with OK
    //--------------------------------------------------------------------------

    var _Window_Options_processOk =
        Window_Options.prototype.processOk;

    Window_Options.prototype.processOk = function() {
        var symbol = this.commandSymbol(this.index());

        if (symbol === DIFFICULTY_SYMBOL) {
            $gameSwitches.setValue(
                DIFFICULTY_SWITCH,
                !$gameSwitches.value(DIFFICULTY_SWITCH)
            );
            this.redrawItem(this.index());
            SoundManager.playCursor();
            return;
        }

        _Window_Options_processOk.call(this);
    };

    //--------------------------------------------------------------------------
    // Toggle with Left/Right
    //--------------------------------------------------------------------------

    var _Window_Options_cursorRight =
        Window_Options.prototype.cursorRight;

    Window_Options.prototype.cursorRight = function(wrap) {
        var symbol = this.commandSymbol(this.index());

        if (symbol === DIFFICULTY_SYMBOL) {
            $gameSwitches.setValue(DIFFICULTY_SWITCH, true);
            this.redrawItem(this.index());
            SoundManager.playCursor();
            return;
        }

        _Window_Options_cursorRight.call(this, wrap);
    };

    var _Window_Options_cursorLeft =
        Window_Options.prototype.cursorLeft;

    Window_Options.prototype.cursorLeft = function(wrap) {
        var symbol = this.commandSymbol(this.index());

        if (symbol === DIFFICULTY_SYMBOL) {
            $gameSwitches.setValue(DIFFICULTY_SWITCH, false);
            this.redrawItem(this.index());
            SoundManager.playCursor();
            return;
        }

        _Window_Options_cursorLeft.call(this, wrap);
    };

})();
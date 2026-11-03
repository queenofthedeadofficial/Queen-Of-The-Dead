//=============================================================================
// Andrew_RememberPartyCommand.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_RememberPartyCommand = true;

var Andrew = Andrew || {};
Andrew.RememberPartyCommand = Andrew.RememberPartyCommand || {};

/*:
 * @plugindesc v1.00 Remembers the last selected Party Command and restores
 * cursor position to it, both within a battle and across battles.
 * @author Andrew
 *
 * @help
 * -----------------------------------------------------------------------------
 * Andrew_RememberPartyCommand.js
 * -----------------------------------------------------------------------------
 * Remembers whichever Party Command symbol (Fight, Escape, or any custom
 * command added by YEP add-ons) was last confirmed, and moves the cursor
 * to that command whenever the Party Command window opens again - next
 * turn, next battle, even after save/load, since it's stored on
 * $gameSystem.
 *
 * If the remembered symbol doesn't exist in the current command list
 * (e.g. very first battle, or a command that got removed/disabled), the
 * window just falls back to its normal default selection.
 *
 * No plugin commands. No parameters. Companion plugin - does not modify
 * any core or YEP files directly.
 *
 * Place below YEP_BattleEngineCore and any plugin that adds/reorders
 * Party Commands, so the symbol lookup happens after the final command
 * list is built.
 * -----------------------------------------------------------------------------
 */

(function() {

    //--------------------------------------------------------------------------
    // Game_System - persistent storage (survives battles + save/load)
    //--------------------------------------------------------------------------

    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._andrewLastPartyCommand = null;
    };

    Game_System.prototype.andrewLastPartyCommand = function() {
        return this._andrewLastPartyCommand;
    };

    Game_System.prototype.setAndrewLastPartyCommand = function(symbol) {
        this._andrewLastPartyCommand = symbol;
    };

    //--------------------------------------------------------------------------
    // Window_Command - findSymbol isn't in base MV (it's an MZ addition),
    // so add it defensively in case nothing else has already.
    //--------------------------------------------------------------------------

    if (!Window_Command.prototype.findSymbol) {
        Window_Command.prototype.findSymbol = function(symbol) {
            for (var i = 0; i < this._list.length; i++) {
                if (this._list[i].symbol === symbol) {
                    return i;
                }
            }
            return -1;
        };
    }

    //--------------------------------------------------------------------------
    // Window_PartyCommand - remember on confirm, restore on setup
    //--------------------------------------------------------------------------

    var _Window_PartyCommand_setup = Window_PartyCommand.prototype.setup;
    Window_PartyCommand.prototype.setup = function() {
        _Window_PartyCommand_setup.call(this);
        this.andrewRestoreLastSelection();
    };

    Window_PartyCommand.prototype.andrewRestoreLastSelection = function() {
        var symbol = $gameSystem.andrewLastPartyCommand();
        if (!symbol) return;
        var index = this.findSymbol(symbol);
        if (index >= 0) {
            this.select(index);
        }
    };

    var _Window_PartyCommand_callOkHandler = Window_PartyCommand.prototype.callOkHandler;
    Window_PartyCommand.prototype.callOkHandler = function() {
        $gameSystem.setAndrewLastPartyCommand(this.currentSymbol());
        _Window_PartyCommand_callOkHandler.call(this);
    };

})();
/*:
 * @plugindesc Adds Combat Log to the party commands in a YEP-safe way.
 * @author ChatGPT
 */

(function() {

"use strict";

if (!Window_PartyCommand.prototype.addCustomCommands) {
    Window_PartyCommand.prototype.addCustomCommands = function() {};
}

const _addCustomCommands =
    Window_PartyCommand.prototype.addCustomCommands;

Window_PartyCommand.prototype.addCustomCommands = function() {
    _addCustomCommands.call(this);

    if (!this.findSymbol("combatLog")) {
        var enabled =
            BattleManager._combatTimeline &&
            BattleManager._combatTimeline.length > 0;

        this.addCommand("Combat Log", "combatLog", enabled);
    }
};

Window_Command.prototype.findSymbol = function(symbol) {
    return this._list.some(function(cmd) {
        return cmd.symbol === symbol;
    });
};

})();
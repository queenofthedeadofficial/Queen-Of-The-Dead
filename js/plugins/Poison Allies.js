/*:
 * @plugindesc Links passive State 110 to real State 4.
 * @author ChatGPT
 */

(function() {

var SOURCE_STATE = 110;
var LINKED_STATE = 4;

var _Game_Battler_refresh = Game_Battler.prototype.refresh;

Game_Battler.prototype.refresh = function() {
    _Game_Battler_refresh.call(this);

    var hasSource = this.isStateAffected(SOURCE_STATE);

    if (hasSource) {
        // Only add if not already affected, and remember that WE added it.
        if (!this.isStateAffected(LINKED_STATE)) {
            this.addState(LINKED_STATE);
            this._poisonLinkedBySource = true;
        }
    } else if (this._poisonLinkedBySource) {
        // Only remove state 4 if this plugin was the one that added it.
        // Poison applied by a skill/item/other source is left alone.
        this.removeState(LINKED_STATE);
        this._poisonLinkedBySource = false;
    }
};

})();
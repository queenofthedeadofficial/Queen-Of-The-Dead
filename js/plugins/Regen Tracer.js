/*:
 * @plugindesc Debug Regeneration Trace
 */

(function() {

var _Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;

Game_Battler.prototype.regenerateAll = function() {
    console.log("=== REGENERATE START ===");
    console.log(this.name());
    console.log("States:", this._states);

    console.log("State 4 affected:", this.isStateAffected(4));

    if (this.isStateAffected(4)) {
        console.log("State 4 object:", $dataStates[4]);
    }

    _Game_Battler_regenerateAll.call(this);

    console.log("=== REGENERATE END ===");
};

})();
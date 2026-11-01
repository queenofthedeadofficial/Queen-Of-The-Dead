/*:
 * @plugindesc Heals 4 HP during regeneration if battler has State 145 and State 112.
 * @author ChatGPT
 */

(function() {

var REQUIRED_STATE_1 = 145;
var REQUIRED_STATE_2 = 150;
var HEAL_AMOUNT = 2;

var _Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;

Game_Battler.prototype.regenerateAll = function() {

    _Game_Battler_regenerateAll.call(this);

    if (this.isStateAffected(REQUIRED_STATE_1) &&
        this.isStateAffected(REQUIRED_STATE_2)) {

        var oldHp = this.hp;

        this.gainHp(HEAL_AMOUNT);

        if (this.hp !== oldHp) {
            this.startDamagePopup();
        }

        this.clearResult();
    }
};

})();
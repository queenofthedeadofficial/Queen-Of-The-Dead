/*:
 * @plugindesc Doubles ATK if battler has state 11 and exactly 1 HP (post-calculation).
 * @author You
 */

(function() {
"use strict";

const TARGET_PARAM = 2; // 2 = ATK
const TARGET_STATE = 11;

const _Game_BattlerBase_param = Game_BattlerBase.prototype.param;
Game_BattlerBase.prototype.param = function(paramId) {
    let value = _Game_BattlerBase_param.call(this, paramId);

    // Apply only to ATK
    if (paramId === TARGET_PARAM) {
        if (this.hp === 1 && this.isStateAffected(TARGET_STATE)) {
            value *= 2;
        }
    }

    return value;
};

})();
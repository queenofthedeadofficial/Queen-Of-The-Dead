/*:
 * @plugindesc v1.0 Clamps ATK and MAT to 1 if battler has State 89.
 * @author ChatGPT
 *
 * @help
 * If a battler is affected by State 89:
 *   - ATK is treated as 1
 *   - MAT is treated as 1
 *
 * This does NOT permanently change stats, only computed values.
 */

(function() {

"use strict";

const STATE_ID = 89;
const CLAMPED_PARAMS = [2, 4]; 
// 2 = ATK, 4 = MAT in RPG Maker MV param order

const _Game_BattlerBase_paramBase = Game_BattlerBase.prototype.paramBase;

Game_BattlerBase.prototype.paramBase = function(paramId) {
    const value = _Game_BattlerBase_paramBase.call(this, paramId);

    if (this.isActor && this.isEnemy && false) {
        // safety placeholder (never runs)
    }

    if (this.isStateAffected(STATE_ID)) {
        if (paramId === 2 || paramId === 4) {
            return 1;
        }
    }

    return value;
};

})();
/*:
 * @plugindesc Stores the skill/item that applied each state.
 */

(function() {

"use strict";

const _Game_Action_itemEffectAddState =
    Game_Action.prototype.itemEffectAddState;

Game_Action.prototype.itemEffectAddState = function(target, effect) {
    _Game_Action_itemEffectAddState.call(this, target, effect);

    if (target.isStateAffected(effect.dataId)) {
        target._stateSkillNames = target._stateSkillNames || {};
        target._stateSkillNames[effect.dataId] = this.item().name;
    }
};

})();
/*:
 * @plugindesc Stable Last Skill/Item Auto-Battle (no BattleManager hooks, no recursion, YEP-safe)
 */

(() => {

function recordLastAction(actor, action) {
    if (!actor || !action) return;

    actor._lastBattleAction = {
        type: action.isSkill() ? "skill"
            : action.isItem() ? "item"
            : "attack",
        id: action.item() ? action.item().id : 0
    };
}

// -----------------------------------------------------
// SAFE: capture executed action (MV-native hook point)
// -----------------------------------------------------
const _Game_Action_apply = Game_Action.prototype.apply;
Game_Action.prototype.apply = function(target) {

    const subject = this.subject && this.subject();

    if (subject) {
        recordLastAction(subject, this);
    }

    return _Game_Action_apply.call(this, target);
};

// -----------------------------------------------------
// CORE: auto-battle action generation ONLY
// -----------------------------------------------------
Game_Actor.prototype.makeAutoBattleActions = function() {

    this.clearActions();

    const last = this._lastBattleAction;

    const action = new Game_Action(this);

    if (last && last.type === "skill" && $dataSkills[last.id]) {

        if (this.meetsSkillConditions($dataSkills[last.id])) {
            action.setSkill(last.id);
        } else {
            action.setAttack();
        }

    } else if (last && last.type === "item" && $dataItems[last.id]) {

        action.setItem(last.id);

    } else {
        action.setAttack();
    }

    this.setAction(0, action);
};

})();
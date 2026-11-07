/*:
 * @plugindesc Unseals skill 353 for actor 15 while they have state 100.
 * @author Andrew
 */

(function() {

const TARGET_ACTOR_ID = 16;
const TARGET_SKILL_ID = 353;
const UNSEAL_STATE_ID = 100;

const _Game_BattlerBase_isSkillSealed = Game_BattlerBase.prototype.isSkillSealed;
Game_BattlerBase.prototype.isSkillSealed = function(skillId) {
    if (this.isActor && this.isActor() &&
        this.actorId() === TARGET_ACTOR_ID &&
        skillId === TARGET_SKILL_ID &&
        this.isStateAffected(UNSEAL_STATE_ID)) {
        return false;
    }
    return _Game_BattlerBase_isSkillSealed.call(this, skillId);
};

})();
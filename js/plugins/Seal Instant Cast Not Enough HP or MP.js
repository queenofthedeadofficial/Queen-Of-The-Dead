/*:
 * @plugindesc Seals <Instant Cast> skills in battle when the actor cannot pay the HP or MP cost.
 * @author VA
 *
 * @help
 * Instant Cast skills are sealed during battle if the actor cannot afford
 * their HP or MP cost.
 *
 * Required notetag:
 *
 *   <Instant Cast>
 *
 * The skill is considered unusable when:
 *
 *   - The actor does not have enough MP, or
 *   - The actor does not have enough HP to pay the HP cost.
 *
 * Normal skills are unaffected.
 *
 * This plugin does not create or apply states.
 */

(function() {

    'use strict';

    var _Game_BattlerBase_isSkillSealed =
        Game_BattlerBase.prototype.isSkillSealed;

    Game_BattlerBase.prototype.isSkillSealed = function(skillId) {

        var skill = $dataSkills[skillId];

        if (skill && skill.meta && skill.meta['Instant Cast']) {

            var actor = this;

            // Only apply this restriction to actors.
            if (actor.isActor()) {

                // MP requirement.
                if (actor.skillMpCost(skill) > actor.mp) {
                    return true;
                }

                // HP requirement.
                if (actor.skillHpCost(skill) > actor.hp) {
                    return true;
                }
            }
        }

        return _Game_BattlerBase_isSkillSealed.call(this, skillId);
    };

})();
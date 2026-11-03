/*:
 * @plugindesc Seals specific skills for Actor 3 depending on which party members are present.
 * @author ChatGPT
 *
 * @help
 * This plugin only affects Actor 3.
 *
 * Conditions:
 * Actor 9  in party -> seal Skill 17
 * Actor 10 in party -> seal Skill 120
 * Actor 11 in party -> seal Skill 121
 * Actor 12 in party -> seal Skill 140
 * Actor 13 in party -> seal Skill 137
 * Actor 14 in party -> seal Skill 136
 * Actor 15 in party -> seal Skill 138
 * Actor 16 in party -> seal Skill 139
 * Actor 17 in party -> seal Skill 141
 * Actor 18 in party -> seal Skill 241
 * Actor 19 in party -> seal Skill 279
 *
 * Place below YEP_CoreEngine.
 */

(function() {
    "use strict";

    const TARGET_ACTOR_ID = 3;

    const SEAL_TABLE = {
        9: 17,
        10: 120,
        11: 121,
        12: 140,
        13: 137,
        14: 136,
        15: 138,
        16: 139,
        17: 141,
        18: 241,
        19: 279
    };

    const _Game_BattlerBase_isSkillSealed =
        Game_BattlerBase.prototype.isSkillSealed;

    Game_BattlerBase.prototype.isSkillSealed = function(skillId) {
        // Preserve normal skill sealing behavior.
        if (_Game_BattlerBase_isSkillSealed.call(this, skillId)) {
            return true;
        }

        // Only affect Actor 3.
        if (!this.isActor() || this.actorId() !== TARGET_ACTOR_ID) {
            return false;
        }

        // Check each actor-skill pair.
        for (const actorId in SEAL_TABLE) {
            if ($gameParty.members().some(member => member.actorId() === Number(actorId))) {
                if (skillId === SEAL_TABLE[actorId]) {
                    return true;
                }
            }
        }

        return false;
    };

})();
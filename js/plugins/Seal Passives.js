/*:
 * @plugindesc Seals all skills from Skill Type 12 in the menu and battle.
 * @author VA
 *
 * @help
 * Permanently seals all skills belonging to Skill Type 12.
 *
 * This affects:
 * - Skill selection in the menu
 * - Skill selection in battle
 *
 * No database state is required.
 */

(function() {

    'use strict';

    var SEALED_SKILL_TYPE_ID = 12;

    // Seal the entire skill type.
    var _Game_BattlerBase_isSkillTypeSealed =
        Game_BattlerBase.prototype.isSkillTypeSealed;

    Game_BattlerBase.prototype.isSkillTypeSealed = function(stypeId) {
        if (stypeId === SEALED_SKILL_TYPE_ID) {
            return true;
        }

        return _Game_BattlerBase_isSkillTypeSealed.call(this, stypeId);
    };

})();
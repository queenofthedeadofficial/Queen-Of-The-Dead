/*:
 * @plugindesc Seals skill 58 if no valid items exist, and skips turn if somehow used anyway.
 * @author You
 */

(function() {
"use strict";

// ------------------------------
// CONFIG
// ------------------------------
const SKILL_ID = 58;
const REQUIRED_CATEGORIES = ["Foods", "Potions", "Soups"];

// ------------------------------
// HELPER: CHECK INVENTORY
// ------------------------------
function partyHasValidItems() {
    const items = $gameParty.items();

    return items.some(item => {
        if (!item || !item.note) return false;

        return REQUIRED_CATEGORIES.some(category => {
            const tag = `<Menu Category: ${category}>`;
            return item.note.includes(tag);
        });
    });
}

// ------------------------------
// OVERRIDE SKILL CONDITIONS
// ------------------------------
const _Game_BattlerBase_meetsSkillConditions =
    Game_BattlerBase.prototype.meetsSkillConditions;

Game_BattlerBase.prototype.meetsSkillConditions = function(skill) {
    if (skill && skill.id === SKILL_ID) {
        if (!partyHasValidItems()) {
            return false;
        }
    }

    return _Game_BattlerBase_meetsSkillConditions.call(this, skill);
};

// ------------------------------
// FAILSAFE: SKIP ACTION IF INVALID
// ------------------------------
const _Game_Action_apply = Game_Action.prototype.apply;

Game_Action.prototype.apply = function(target) {
    const subject = this.subject();
    const item = this.item();

    if (item && item.id === SKILL_ID && DataManager.isSkill(item)) {
        if (!partyHasValidItems()) {
            // Do nothing — action is skipped
            return;
        }
    }

    _Game_Action_apply.call(this, target);
};

})();
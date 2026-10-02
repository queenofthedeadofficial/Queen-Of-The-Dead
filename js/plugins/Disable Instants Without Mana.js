/*:
 * @plugindesc Disables <Instant Cast> skills when the actor lacks enough MP.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_InstantCastMPCostCheck.js
 * ============================================================================
 *
 * Prevents skills with the <Instant Cast> notetag from being selected if the
 * actor does not have enough MP to pay the skill cost.
 *
 * Applies to:
 *   - Battle skill window
 *   - Any skill list using Window_SkillList
 *
 * Skills without <Instant Cast> behave normally.
 *
 * Place below YEP_SkillCore and YEP_InstantCast.
 * ============================================================================
 */

(function() {

"use strict";


//-----------------------------------------------------------------------------
// Check Instant Cast notetag
//-----------------------------------------------------------------------------

function isInstantCast(skill) {

    if (!skill || !skill.note)
        return false;

    return /<Instant[ ]*Cast>/i.test(skill.note);

}


//-----------------------------------------------------------------------------
// Skill enable check
//-----------------------------------------------------------------------------

var _Window_SkillList_isEnabled =
    Window_SkillList.prototype.isEnabled;


Window_SkillList.prototype.isEnabled = function(item) {

    if (item &&
        isInstantCast(item) &&
        this._actor) {

        if (this._actor.mp < this._actor.skillMpCost(item)) {
            return false;
        }

    }


    return _Window_SkillList_isEnabled.call(this, item);

};


})();
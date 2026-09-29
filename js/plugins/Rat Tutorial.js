/*:
 * @plugindesc v1.00 Tutorial lock for Actor 14. Allows only Skill Type 2 and Skill 199 until Switches 4988 and 4989 are ON.
 * @author Andrew
 *
 * @param Actor ID
 * @type actor
 * @default 14
 *
 * @param Allowed Skill Type
 * @type number
 * @desc Skill Type ID that remains enabled while locked.
 * @default 2
 *
 * @param Allowed Skill
 * @type skill
 * @desc Only this skill remains usable inside the allowed Skill Type.
 * @default 199
 *
 * @param Unlock Switch 1
 * @type switch
 * @desc First switch required to unlock Actor 14.
 * @default 4988
 *
 * @param Unlock Switch 2
 * @type switch
 * @desc Second switch required to unlock Actor 14.
 * @default 4989
 *
 * @help
 * ============================================================================
 * Andrew_TutorialCommandLock_Actor14.js
 * ============================================================================
 *
 * While either Unlock Switch is OFF:
 *
 * Actor 14:
 *   - All actor commands are disabled except Skill Type 2.
 *   - Within Skill Type 2, only Skill 199 is enabled.
 *   - All other skills and custom commands are disabled.
 *
 * When BOTH switches 4988 and 4989 are ON:
 *
 *   - Actor 14 behaves normally.
 *
 * Place below plugins that add actor commands.
 * ============================================================================
 */

(function() {

"use strict";

var params = PluginManager.parameters("Andrew_TutorialCommandLock_Actor14");

var ACTOR_ID = Number(params["Actor ID"] || 14);
var ALLOWED_STYPE = Number(params["Allowed Skill Type"] || 2);
var ALLOWED_SKILL = Number(params["Allowed Skill"] || 199);

var UNLOCK_SWITCH_1 = Number(params["Unlock Switch 1"] || 4988);
var UNLOCK_SWITCH_2 = Number(params["Unlock Switch 2"] || 4989);


//-----------------------------------------------------------------------------
// Lock check
//-----------------------------------------------------------------------------

function tutorialLocked(actor) {
    return actor &&
           actor.actorId() === ACTOR_ID &&
           !($gameSwitches.value(UNLOCK_SWITCH_1) &&
             $gameSwitches.value(UNLOCK_SWITCH_2));
}


//-----------------------------------------------------------------------------
// Apply actor command restrictions
//-----------------------------------------------------------------------------

function applyRestrictions(win) {

    if (!tutorialLocked(win._actor))
        return;

    win._list.forEach(function(cmd) {

        // Allow only Skill Type 2.
        if (cmd.symbol === "skill" &&
            cmd.ext === ALLOWED_STYPE) {

            cmd.enabled = true;

        } else {

            cmd.enabled = false;

        }

    });

}


//-----------------------------------------------------------------------------
// Actor Command Window
//-----------------------------------------------------------------------------

var _Window_ActorCommand_setup =
    Window_ActorCommand.prototype.setup;

Window_ActorCommand.prototype.setup = function(actor) {

    _Window_ActorCommand_setup.call(this, actor);

    applyRestrictions(this);

    this.refresh();

};


//-----------------------------------------------------------------------------
// Safety refresh hook
//-----------------------------------------------------------------------------

var _Window_ActorCommand_refresh =
    Window_ActorCommand.prototype.refresh;

Window_ActorCommand.prototype.refresh = function() {

    _Window_ActorCommand_refresh.call(this);

    applyRestrictions(this);

    if (tutorialLocked(this._actor)) {

        this.contents.clear();
        this.drawAllItems();

    }

};


//-----------------------------------------------------------------------------
// Skill restriction
//-----------------------------------------------------------------------------

var _Window_BattleSkill_isEnabled =
    Window_BattleSkill.prototype.isEnabled;

Window_BattleSkill.prototype.isEnabled = function(item) {

    if (tutorialLocked(this._actor)) {

        if (!item)
            return false;

        if (item.stypeId !== ALLOWED_STYPE)
            return false;

        if (item.id !== ALLOWED_SKILL)
            return false;

    }

    return _Window_BattleSkill_isEnabled.call(this, item);

};


})();
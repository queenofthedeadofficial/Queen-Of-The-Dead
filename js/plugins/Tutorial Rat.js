/*:
 * @plugindesc v1.00 Tutorial lock for Actor 15. Allows only Skill Type 2 and Skill 199 until Switches 4988 and 4989 are ON.
 * @author Andrew
 *
 * @param Actor ID
 * @type actor
 * @default 15
 *
 * @param Allowed Skill Type
 * @type number
 * @default 2
 *
 * @param Allowed Skill
 * @type skill
 * @default 199
 *
 * @param Unlock Switch 1
 * @type switch
 * @default 4988
 *
 * @param Unlock Switch 2
 * @type switch
 * @default 4989
 *
 * @help
 * ============================================================================
 * Andrew_TutorialLock_Actor15.js
 * ============================================================================
 *
 * While either unlock switch is OFF:
 *
 * Actor 15:
 *   - Only Skill Type 2 remains enabled.
 *   - Only Skill 199 is usable.
 *   - All other actor commands are disabled.
 *
 * When BOTH switches 4988 and 4989 are ON:
 *
 *   - Actor 15 behaves normally.
 *
 * Designed for actors added dynamically during battle.
 *
 * ============================================================================
 */

(function() {

"use strict";

var params = PluginManager.parameters(
    "Andrew_TutorialLock_Actor15"
);

var ACTOR_ID = Number(params["Actor ID"] || 15);
var ALLOWED_STYPE = Number(params["Allowed Skill Type"] || 2);
var ALLOWED_SKILL = Number(params["Allowed Skill"] || 199);

var SWITCH_1 = Number(params["Unlock Switch 1"] || 4988);
var SWITCH_2 = Number(params["Unlock Switch 2"] || 4989);


//-----------------------------------------------------------------------------
// Lock check
//-----------------------------------------------------------------------------

function isLocked(actor) {
    return actor &&
           actor.actorId() === ACTOR_ID &&
           !($gameSwitches.value(SWITCH_1) &&
             $gameSwitches.value(SWITCH_2));
}


//-----------------------------------------------------------------------------
// Actor Commands
//-----------------------------------------------------------------------------

function applyCommandRestriction(window) {

    if (!isLocked(window._actor))
        return;

    window._list.forEach(function(command) {

        command.enabled =
            (command.symbol === "skill" &&
             command.ext === ALLOWED_STYPE);

    });

}


var _Window_ActorCommand_makeCommandList =
    Window_ActorCommand.prototype.makeCommandList;

Window_ActorCommand.prototype.makeCommandList = function() {

    _Window_ActorCommand_makeCommandList.call(this);

    applyCommandRestriction(this);

};


var _Window_ActorCommand_refresh =
    Window_ActorCommand.prototype.refresh;

Window_ActorCommand.prototype.refresh = function() {

    _Window_ActorCommand_refresh.call(this);

    applyCommandRestriction(this);

};


//-----------------------------------------------------------------------------
// Force Skill 199 into Skill Type 2 list if needed
//-----------------------------------------------------------------------------

var _Window_BattleSkill_makeItemList =
    Window_BattleSkill.prototype.makeItemList;

Window_BattleSkill.prototype.makeItemList = function() {

    _Window_BattleSkill_makeItemList.call(this);

    if (!isLocked(this._actor))
        return;

    if (this._stypeId !== ALLOWED_STYPE)
        return;

    var skill = $dataSkills[ALLOWED_SKILL];

    if (skill && this._data.indexOf(skill) < 0) {
        this._data.push(skill);
    }

};


//-----------------------------------------------------------------------------
// Skill enable restriction
//-----------------------------------------------------------------------------

var _Window_BattleSkill_isEnabled =
    Window_BattleSkill.prototype.isEnabled;

Window_BattleSkill.prototype.isEnabled = function(item) {

    if (isLocked(this._actor)) {

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
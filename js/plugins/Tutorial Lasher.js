/*:
 * @plugindesc v1.00 Tutorial lock for Actor 16. Allows only Skill Type 8 until Switches 4988 and 4989 are ON.
 * @author Andrew
 *
 * @param Actor ID
 * @type actor
 * @default 16
 *
 * @param Allowed Skill Type
 * @type number
 * @desc Skill Type ID that remains enabled while locked.
 * @default 8
 *
 * @param Unlock Switch 1
 * @type switch
 * @desc First switch required to unlock Actor 16.
 * @default 4988
 *
 * @param Unlock Switch 2
 * @type switch
 * @desc Second switch required to unlock Actor 16.
 * @default 4989
 *
 * @help
 * ============================================================================
 * Andrew_TutorialLock_Actor16.js
 * ============================================================================
 *
 * While either unlock switch is OFF:
 *
 * Actor 16:
 *   - Only Skill Type 8 remains enabled.
 *   - All other actor commands are disabled.
 *   - Custom commands added by plugins are also disabled.
 *
 * When BOTH switches 4988 and 4989 are ON:
 *
 *   - Actor 16 behaves normally.
 *
 * Place below plugins that add actor commands.
 * ============================================================================
 */

(function() {

"use strict";

var params = PluginManager.parameters(
    "Andrew_TutorialLock_Actor16"
);

var ACTOR_ID = Number(params["Actor ID"] || 16);
var ALLOWED_STYPE = Number(params["Allowed Skill Type"] || 8);

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
// Actor command restriction
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


//-----------------------------------------------------------------------------
// Actor Command Window
//-----------------------------------------------------------------------------

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


})();
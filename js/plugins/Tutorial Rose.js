/*:
 * @plugindesc v1.02 Tutorial lock for Actor 3 with isolated Tutorial command.
 * @author Andrew
 *
 * @help
 * Actor 3 tutorial restriction.
 *
 * Locked until Switches 4988 and 4989 are ON:
 *
 * Enabled:
 *   - Skill Type 8
 *   - Tutorial command
 *
 * Tutorial:
 *   Use Quick Attack with Rose's Rat
 *   and Magic Dart with Rose's Lasher.
 */

(function() {

"use strict";


var ACTOR_ID = 3;
var ALLOWED_STYPE = 6;

var UNLOCK_SWITCH_1 = 4988;
var UNLOCK_SWITCH_2 = 4989;


var TUTORIAL_TEXT_ACTOR3 =
    "Use \\C[34]Quick Attack\\C[0] with Rose's Rat\nand \\C[34]Magic Dart\\C[0] with Rose's Lasher.";


var tutorialCommandPendingActor3 = false;
var tutorialMessageActiveActor3 = false;


//-----------------------------------------------------------------------------
// Lock
//-----------------------------------------------------------------------------

function tutorialLockedActor3(actor) {

    return actor &&
           actor.actorId() === ACTOR_ID &&
           !($gameSwitches.value(UNLOCK_SWITCH_1) &&
             $gameSwitches.value(UNLOCK_SWITCH_2));

}


//-----------------------------------------------------------------------------
// Add command
//-----------------------------------------------------------------------------

var _Window_ActorCommand_makeCommandList_A3 =
    Window_ActorCommand.prototype.makeCommandList;


Window_ActorCommand.prototype.makeCommandList = function() {

    _Window_ActorCommand_makeCommandList_A3.call(this);


    if (tutorialLockedActor3(this._actor)) {

        this.addCommand(
            "Tutorial",
            "tutorialActor3",
            true
        );

    }

};


//-----------------------------------------------------------------------------
// Restrictions
//-----------------------------------------------------------------------------

function applyRestrictionsActor3(win) {

    if (!tutorialLockedActor3(win._actor))
        return;


    win._list.forEach(function(cmd) {

        if (cmd.symbol === "tutorialActor3") {

            cmd.enabled = true;

        } else if (cmd.symbol === "skill" &&
                   cmd.ext === ALLOWED_STYPE) {

            cmd.enabled = true;

        } else {

            cmd.enabled = false;

        }

    });

}


//-----------------------------------------------------------------------------
// Refresh
//-----------------------------------------------------------------------------

var _Window_ActorCommand_refresh_A3 =
    Window_ActorCommand.prototype.refresh;


Window_ActorCommand.prototype.refresh = function() {

    _Window_ActorCommand_refresh_A3.call(this);

    applyRestrictionsActor3(this);

};


//-----------------------------------------------------------------------------
// Gray disabled commands
//-----------------------------------------------------------------------------

var _Window_ActorCommand_isCommandEnabled_A3 =
    Window_ActorCommand.prototype.isCommandEnabled;


Window_ActorCommand.prototype.isCommandEnabled = function(index) {

    if (tutorialLockedActor3(this._actor)) {

        var cmd = this._list[index];

        if (cmd &&
            cmd.symbol !== "tutorialActor3" &&
            !(cmd.symbol === "skill" &&
              cmd.ext === ALLOWED_STYPE)) {

            return false;

        }

    }


    return _Window_ActorCommand_isCommandEnabled_A3.call(this,index);

};


//-----------------------------------------------------------------------------
// Handler
//-----------------------------------------------------------------------------

var _Scene_Battle_createActorCommandWindow_A3 =
    Scene_Battle.prototype.createActorCommandWindow;


Scene_Battle.prototype.createActorCommandWindow = function() {

    _Scene_Battle_createActorCommandWindow_A3.call(this);


    this._actorCommandWindow.setHandler(
        "tutorialActor3",
        this.commandTutorialActor3.bind(this)
    );

};


Scene_Battle.prototype.commandTutorialActor3 = function() {

    tutorialCommandPendingActor3 = true;

};


//-----------------------------------------------------------------------------
// Message
//-----------------------------------------------------------------------------

var _Scene_Battle_update_A3 =
    Scene_Battle.prototype.update;


Scene_Battle.prototype.update = function() {

    _Scene_Battle_update_A3.call(this);


    if (tutorialCommandPendingActor3 &&
        !$gameMessage.isBusy()) {

        tutorialCommandPendingActor3 = false;
        tutorialMessageActiveActor3 = true;

        $gameMessage.add(
            TUTORIAL_TEXT_ACTOR3
        );

        return;

    }


    if (tutorialMessageActiveActor3 &&
        !$gameMessage.isBusy()) {

        tutorialMessageActiveActor3 = false;


        if (SceneManager._scene &&
            SceneManager._scene.changeInputWindow) {

            SceneManager._scene.changeInputWindow();

        }

    }

};


})();
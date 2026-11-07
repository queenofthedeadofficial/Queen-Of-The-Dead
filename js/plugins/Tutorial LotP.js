/*:
 * @plugindesc v1.07 Tutorial lock for Actor 2 with isolated Tutorial command.
 * @author Andrew
 *
 * @help
 * Actor 2 tutorial restriction.
 *
 * Locked until Switch 4990 is ON:
 *
 * Enabled:
 *   - Skill Type 7
 *   - Skill 58
 *   - Tutorial command
 *
 * Tutorial:
 *   Cast Life of the Party with Emma.
 */

(function() {

"use strict";


var ACTOR_ID = 2;
var ALLOWED_STYPE = 7;
var ALLOWED_SKILL = 58;
var UNLOCK_SWITCH = 4990;


var TUTORIAL_TEXT_ACTOR2 =
    "Cast \\C[34]Life of the Party\\C[0] with Emma.";


var tutorialCommandPendingActor2 = false;
var tutorialMessageActiveActor2 = false;


//-----------------------------------------------------------------------------
// Lock
//-----------------------------------------------------------------------------

function tutorialLockedActor2(actor) {

    return actor &&
           actor.actorId() === ACTOR_ID &&
           !$gameSwitches.value(UNLOCK_SWITCH);

}


//-----------------------------------------------------------------------------
// Add command
//-----------------------------------------------------------------------------

var _Window_ActorCommand_makeCommandList_A2 =
    Window_ActorCommand.prototype.makeCommandList;


Window_ActorCommand.prototype.makeCommandList = function() {

    _Window_ActorCommand_makeCommandList_A2.call(this);


    if (tutorialLockedActor2(this._actor)) {

        this.addCommand(
            "Tutorial",
            "tutorialActor2",
            true
        );

    }

};


//-----------------------------------------------------------------------------
// Restrictions
//-----------------------------------------------------------------------------

function applyRestrictionsActor2(win) {

    if (!tutorialLockedActor2(win._actor))
        return;


    win._list.forEach(function(cmd) {

        if (cmd.symbol === "tutorialActor2") {

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
// Command refresh
//-----------------------------------------------------------------------------

var _Window_ActorCommand_refresh_A2 =
    Window_ActorCommand.prototype.refresh;


Window_ActorCommand.prototype.refresh = function() {

    _Window_ActorCommand_refresh_A2.call(this);

    applyRestrictionsActor2(this);

};


//-----------------------------------------------------------------------------
// Force gray
//-----------------------------------------------------------------------------

var _Window_ActorCommand_isCommandEnabled_A2 =
    Window_ActorCommand.prototype.isCommandEnabled;


Window_ActorCommand.prototype.isCommandEnabled = function(index) {

    if (tutorialLockedActor2(this._actor)) {

        var cmd = this._list[index];

        if (cmd &&
            cmd.symbol !== "tutorialActor2" &&
            !(cmd.symbol === "skill" &&
              cmd.ext === ALLOWED_STYPE)) {

            return false;

        }

    }


    return _Window_ActorCommand_isCommandEnabled_A2.call(this,index);

};


//-----------------------------------------------------------------------------
// Skill restriction
//-----------------------------------------------------------------------------

var _Window_BattleSkill_isEnabled_A2 =
    Window_BattleSkill.prototype.isEnabled;


Window_BattleSkill.prototype.isEnabled = function(item) {

    if (tutorialLockedActor2(this._actor)) {

        if (!item)
            return false;

        if (item.stypeId !== ALLOWED_STYPE)
            return false;

        if (item.id !== ALLOWED_SKILL)
            return false;

    }


    return _Window_BattleSkill_isEnabled_A2.call(this,item);

};


//-----------------------------------------------------------------------------
// Handler
//-----------------------------------------------------------------------------

var _Scene_Battle_createActorCommandWindow_A2 =
    Scene_Battle.prototype.createActorCommandWindow;


Scene_Battle.prototype.createActorCommandWindow = function() {

    _Scene_Battle_createActorCommandWindow_A2.call(this);


    this._actorCommandWindow.setHandler(
        "tutorialActor2",
        this.commandTutorialActor2.bind(this)
    );

};


Scene_Battle.prototype.commandTutorialActor2 = function() {

    tutorialCommandPendingActor2 = true;

};


//-----------------------------------------------------------------------------
// Message
//-----------------------------------------------------------------------------

var _Scene_Battle_update_A2 =
    Scene_Battle.prototype.update;


Scene_Battle.prototype.update = function() {

    _Scene_Battle_update_A2.call(this);


    if (tutorialCommandPendingActor2 &&
        !$gameMessage.isBusy()) {

        tutorialCommandPendingActor2 = false;
        tutorialMessageActiveActor2 = true;

        $gameMessage.add(
            TUTORIAL_TEXT_ACTOR2
        );

        return;

    }


    if (tutorialMessageActiveActor2 &&
        !$gameMessage.isBusy()) {

        tutorialMessageActiveActor2 = false;

        if (SceneManager._scene &&
            SceneManager._scene.changeInputWindow) {

            SceneManager._scene.changeInputWindow();

        }

    }

};


})();
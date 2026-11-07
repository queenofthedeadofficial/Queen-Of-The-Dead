/*:
 * @plugindesc v1.02 Tutorial lock for Actor 16. Allows only Skill Type 2 (minus a sealed skill) until Switches 4988 and 4989 are ON.
 * @author Andrew
 *
 * @param Actor ID
 * @type actor
 * @default 16
 *
 * @param Allowed Skill Type
 * @type number
 * @desc Skill Type ID that remains enabled while locked.
 * @default 2
 *
 * @param Sealed Skill ID
 * @type skill
 * @desc Skill that is sealed while locked, even if it belongs to the allowed Skill Type.
 * @default 347
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
 * @param --- Seal Methods ---
 * @desc Turn these on/off to experiment with what works alongside your other plugins.
 * @default
 *
 * @param Seal: Actor canUse
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Overrides Game_Actor.canUse for the sealed skill.
 * @default true
 *
 * @param Seal: Skill Conditions
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Overrides Game_BattlerBase.meetsSkillConditions for the sealed skill.
 * @default true
 *
 * @param Seal: Skill List Enabled
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Overrides Window_SkillList.isEnabled (greys the skill out).
 * @default true
 *
 * @param Seal: Battle Skill Window
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Overrides Window_BattleSkill.isEnabled directly (same approach as the Actor 15 plugin). Wins over plugins that change Window_SkillList.
 * @default true
 *
 * @param Seal: Hide From Skill List
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Hides the sealed skill from skill lists entirely instead of greying it out.
 * @default false
 *
 * @param Seal: Remove From Actor Skills
 * @parent --- Seal Methods ---
 * @type boolean
 * @on ON
 * @off OFF
 * @desc Strongest: removes the skill from Game_Actor.skills() while locked, so most plugins never see it.
 * @default false
 *
 * @help
 * ============================================================================
 * Andrew_TutorialLock_Actor16.js
 * ============================================================================
 *
 * While either unlock switch is OFF:
 *
 * Actor 16:
 *   - Only Skill Type 2 remains enabled.
 *   - Skill 347 is sealed even within Skill Type 2.
 *   - All other actor commands are disabled.
 *   - Custom commands added by plugins are also disabled.
 *
 * When BOTH switches 4988 and 4989 are ON:
 *
 *   - Actor 16 behaves normally and skill 347 is unsealed.
 *
 * Skill sealing is split into several independent methods (see the Seal
 * Methods parameters) so you can try combinations and see which one works
 * with your other plugins. Press F8 in a playtest to see which are active.
 *
 * Place below plugins that add actor commands or alter skill usability.
 * ============================================================================
 */

(function() {

"use strict";

// Detect this file's own name so the plugin works under any filename.
var pluginName = (function() {

    var script = document.currentScript;

    if (script && script.src) {
        var match = decodeURIComponent(script.src)
            .match(/([^\/\\]+)\.js(\?.*)?$/);
        if (match)
            return match[1];
    }

    return "Andrew_TutorialLock_Actor16";

})();

var params = PluginManager.parameters(pluginName);

function boolParam(name, defaultValue) {
    var v = params[name];
    if (v === undefined || v === "")
        return defaultValue;
    return String(v) === "true";
}

var ACTOR_ID = Number(params["Actor ID"] || 16);
var ALLOWED_STYPE = Number(params["Allowed Skill Type"] || 2);
var SEALED_SKILL_ID = Number(params["Sealed Skill ID"] || 347);

var SWITCH_1 = Number(params["Unlock Switch 1"] || 4988);
var SWITCH_2 = Number(params["Unlock Switch 2"] || 4989);

var USE_CAN_USE      = boolParam("Seal: Actor canUse", true);
var USE_CONDITIONS   = boolParam("Seal: Skill Conditions", true);
var USE_LIST_ENABLED = boolParam("Seal: Skill List Enabled", true);
var USE_BATTLE_WIN   = boolParam("Seal: Battle Skill Window", true);
var USE_LIST_HIDE    = boolParam("Seal: Hide From Skill List", false);
var USE_ACTOR_SKILLS = boolParam("Seal: Remove From Actor Skills", false);

console.log("[" + pluginName + "] loaded:", {
    actor: ACTOR_ID,
    allowedStype: ALLOWED_STYPE,
    sealedSkill: SEALED_SKILL_ID,
    switches: [SWITCH_1, SWITCH_2],
    methods: {
        canUse: USE_CAN_USE,
        skillConditions: USE_CONDITIONS,
        listEnabled: USE_LIST_ENABLED,
        battleWindow: USE_BATTLE_WIN,
        listHide: USE_LIST_HIDE,
        actorSkills: USE_ACTOR_SKILLS
    }
});


//-----------------------------------------------------------------------------
// Lock check
//-----------------------------------------------------------------------------

function isLocked(actor) {

    return actor &&
           actor.actorId() === ACTOR_ID &&
           !($gameSwitches.value(SWITCH_1) &&
             $gameSwitches.value(SWITCH_2));

}

function isSealedSkill(actor, item) {

    return !!item &&
           item.id === SEALED_SKILL_ID &&
           isLocked(actor);

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
             Number(command.ext) === ALLOWED_STYPE);

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
// Sealed skill methods (each can be toggled in the plugin parameters)
//-----------------------------------------------------------------------------

// Method 1: Game_Actor.canUse
if (USE_CAN_USE) {

    var _Game_Actor_canUse = Game_Actor.prototype.canUse;

    Game_Actor.prototype.canUse = function(item) {

        if (DataManager.isSkill(item) && isSealedSkill(this, item))
            return false;

        return _Game_Actor_canUse.call(this, item);

    };

}


// Method 2: Game_BattlerBase.meetsSkillConditions
if (USE_CONDITIONS) {

    var _Game_BattlerBase_meetsSkillConditions =
        Game_BattlerBase.prototype.meetsSkillConditions;

    Game_BattlerBase.prototype.meetsSkillConditions = function(skill) {

        if (isSealedSkill(this, skill))
            return false;

        return _Game_BattlerBase_meetsSkillConditions.call(this, skill);

    };

}


// Method 3: Window_SkillList.isEnabled (greyed out)
if (USE_LIST_ENABLED) {

    var _Window_SkillList_isEnabled = Window_SkillList.prototype.isEnabled;

    Window_SkillList.prototype.isEnabled = function(item) {

        if (isSealedSkill(this._actor, item))
            return false;

        return _Window_SkillList_isEnabled.call(this, item);

    };

}


// Method 3b: Window_BattleSkill.isEnabled (same technique as the Actor 15
// plugin). Defining it on Window_BattleSkill itself means it still applies
// even if another plugin replaces Window_SkillList.isEnabled without
// calling the original.
if (USE_BATTLE_WIN) {

    var _Window_BattleSkill_isEnabled =
        Window_BattleSkill.prototype.isEnabled;

    Window_BattleSkill.prototype.isEnabled = function(item) {

        if (isSealedSkill(this._actor, item))
            return false;

        return _Window_BattleSkill_isEnabled.call(this, item);

    };

}


// Method 4: Window_SkillList.includes (hidden)
if (USE_LIST_HIDE) {

    var _Window_SkillList_includes = Window_SkillList.prototype.includes;

    Window_SkillList.prototype.includes = function(item) {

        if (isSealedSkill(this._actor, item))
            return false;

        return _Window_SkillList_includes.call(this, item);

    };

}


// Method 5: Game_Actor.skills (removed from the actor while locked)
if (USE_ACTOR_SKILLS) {

    var _Game_Actor_skills = Game_Actor.prototype.skills;

    Game_Actor.prototype.skills = function() {

        var list = _Game_Actor_skills.call(this);

        if (!isLocked(this))
            return list;

        return list.filter(function(skill) {
            return !skill || skill.id !== SEALED_SKILL_ID;
        });

    };

}


})();
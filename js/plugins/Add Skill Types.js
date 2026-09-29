//=============================================================================
// Andrew_DynamicSkillTypes.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_DynamicSkillTypes = true;

var Andrew = Andrew || {};
Andrew.DynamicSkillTypes = Andrew.DynamicSkillTypes || {};
Andrew.DynamicSkillTypes.version = 1.12;

// Set to true to log every add/remove call and the resulting skill type
// arrays to the console. Useful for diagnosing "it's not adding the type"
// issues (bad actor ID, bad skill type ID, or another plugin clobbering
// _andrewDynamicSkillTypes). Leave false for normal play.
Andrew.DynamicSkillTypes.debug = false;

//=============================================================================
/*:
 * @plugindesc v1.12 Dynamically add/remove Skill Types to actors through Event Script commands.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * EVENT SCRIPT COMMANDS
 * ============================================================================
 *
 * Add Skill Type:
 *
 *   addSkillType(1, 13);
 *
 * Remove Skill Type:
 *
 *   removeSkillType(1, 13);
 *
 * The first number is the ACTOR ID.
 * The second number is the SKILL TYPE ID.
 *
 * Example:
 *
 *   addSkillType(1, 13);
 *   addSkillType(2, 13);
 *   addSkillType(3, 13);
 *
 * This gives Actors 1, 2, and 3 Skill Type 13.
 *
 * ============================================================================
 * NOTES
 * ============================================================================
 *
 * - Only actors can be modified by these commands.
 * - Dynamically added Skill Types are saved with the game.
 * - Removing a dynamically added Skill Type does not remove a Skill Type
 *   provided by the actor's class, equipment, state, etc.
 * - This plugin modifies Game_Actor.addedSkillTypes(), which is the
 *   RPG Maker MV function responsible for additional Skill Types.
 * - This plugin must load BELOW any other plugin that also overrides
 *   addedSkillTypes() on Game_Actor.prototype (for example, a plugin that
 *   hides Skill Types with no known/usable skills), or its filtering will
 *   run after this plugin adds a type and strip it back out. Move this
 *   plugin lower in the Plugin Manager list if that happens.
 * - If a Skill Type doesn't appear after calling addSkillType(), the Skill
 *   scene's type window has to be (re)built after the call - it won't
 *   refresh itself while already open. Close and reopen the Skill menu,
 *   or call addSkillType() before the menu is entered.
 * - Set Andrew.DynamicSkillTypes.debug = true at the top of this file to
 *   log every add/remove call to the console for troubleshooting.
 *
 * ============================================================================
 */

(function() {

    //-------------------------------------------------------------------------
    // Initialize storage for dynamically added Skill Types.
    //-------------------------------------------------------------------------

    var _Game_Actor_initMembers =
        Game_Actor.prototype.initMembers;

    Game_Actor.prototype.initMembers = function() {
        _Game_Actor_initMembers.call(this);

        this._andrewDynamicSkillTypes = [];
    };


    //-------------------------------------------------------------------------
    // Make sure the storage exists when loading/using older save data.
    //-------------------------------------------------------------------------

    var _Game_Actor_setup =
        Game_Actor.prototype.setup;

    Game_Actor.prototype.setup = function(actorId) {

        _Game_Actor_setup.call(this, actorId);

        if (!this._andrewDynamicSkillTypes) {
            this._andrewDynamicSkillTypes = [];
        }
    };


    //-------------------------------------------------------------------------
    // ADD SKILL TYPE
    //-------------------------------------------------------------------------

    Game_Actor.prototype.addDynamicSkillType = function(skillTypeId) {

        skillTypeId = Number(skillTypeId);

        if (!this._andrewDynamicSkillTypes) {
            this._andrewDynamicSkillTypes = [];
        }

        if (skillTypeId <= 0) {
            if (Andrew.DynamicSkillTypes.debug) {
                console.warn(
                    "Andrew_DynamicSkillTypes: addDynamicSkillType() got " +
                    "an invalid skillTypeId (" + skillTypeId + ") for actor " +
                    this.actorId() + ". Ignored."
                );
            }
            return;
        }

        if (!$dataSystem.skillTypes[skillTypeId] && Andrew.DynamicSkillTypes.debug) {
            console.warn(
                "Andrew_DynamicSkillTypes: skill type ID " + skillTypeId +
                " has no entry in Database > Types > Skill Types. The " +
                "command window will show a blank row for it."
            );
        }

        if (this._andrewDynamicSkillTypes.indexOf(skillTypeId) < 0) {
            this._andrewDynamicSkillTypes.push(skillTypeId);
        }

        if (Andrew.DynamicSkillTypes.debug) {
            console.log(
                "Andrew_DynamicSkillTypes: actor " + this.actorId() +
                " dynamic types now:", this._andrewDynamicSkillTypes.slice(),
                "| addedSkillTypes() now:", this.addedSkillTypes()
            );
        }
    };


    //-------------------------------------------------------------------------
    // REMOVE SKILL TYPE
    //-------------------------------------------------------------------------

    Game_Actor.prototype.removeDynamicSkillType = function(skillTypeId) {

        skillTypeId = Number(skillTypeId);

        if (!this._andrewDynamicSkillTypes) {
            this._andrewDynamicSkillTypes = [];
        }

        var index =
            this._andrewDynamicSkillTypes.indexOf(skillTypeId);

        if (index >= 0) {
            this._andrewDynamicSkillTypes.splice(index, 1);
        }

        if (Andrew.DynamicSkillTypes.debug) {
            console.log(
                "Andrew_DynamicSkillTypes: actor " + this.actorId() +
                " dynamic types now:", this._andrewDynamicSkillTypes.slice(),
                "| addedSkillTypes() now:", this.addedSkillTypes()
            );
        }
    };


    //-------------------------------------------------------------------------
    // Add our dynamic Skill Types to the actor's Skill Type list.
    //
    // IMPORTANT:
    // This hooks Game_Actor.prototype.addedSkillTypes, NOT
    // Game_BattlerBase.prototype.addedSkillTypes. Some other plugins (e.g.
    // one that hides Skill Types with no known/usable skills in them) patch
    // Game_Actor.prototype directly, which sits closer to the actor
    // instance in the prototype chain than Game_BattlerBase.prototype -
    // any hook placed on Game_BattlerBase.prototype gets shadowed for
    // actors and silently never runs. Hooking Game_Actor.prototype here,
    // and loading THIS PLUGIN BELOW any such filtering plugin, guarantees
    // we wrap its output and re-add our dynamic types even if it would
    // otherwise filter them out.
    //-------------------------------------------------------------------------

    var _Game_Actor_addedSkillTypes =
        Game_Actor.prototype.addedSkillTypes;

    Game_Actor.prototype.addedSkillTypes = function() {

        var types =
            _Game_Actor_addedSkillTypes.call(this);

        var dynamicTypes =
            this._andrewDynamicSkillTypes || [];

        dynamicTypes.forEach(function(skillTypeId) {

            if (types.indexOf(skillTypeId) < 0) {
                types.push(skillTypeId);
            }

        });

        return types;
    };


    //-------------------------------------------------------------------------
    // EVENT SCRIPT COMMAND:
    //
    // addSkillType(actorId, skillTypeId);
    //-------------------------------------------------------------------------

    window.addSkillType = function(actorId, skillTypeId) {

        actorId = Number(actorId);
        skillTypeId = Number(skillTypeId);

        var actor = $gameActors.actor(actorId);

        if (!actor) {
            console.warn(
                "Andrew_DynamicSkillTypes: addSkillType() called with " +
                "actor ID " + actorId + ", but no such actor exists. " +
                "Remember this is the database Actor ID, not the party " +
                "formation slot."
            );
            return;
        }

        actor.addDynamicSkillType(skillTypeId);
    };


    //-------------------------------------------------------------------------
    // EVENT SCRIPT COMMAND:
    //
    // removeSkillType(actorId, skillTypeId);
    //-------------------------------------------------------------------------

    window.removeSkillType = function(actorId, skillTypeId) {

        actorId = Number(actorId);
        skillTypeId = Number(skillTypeId);

        var actor = $gameActors.actor(actorId);

        if (!actor) {
            console.warn(
                "Andrew_DynamicSkillTypes: removeSkillType() called with " +
                "actor ID " + actorId + ", but no such actor exists. " +
                "Remember this is the database Actor ID, not the party " +
                "formation slot."
            );
            return;
        }

        actor.removeDynamicSkillType(skillTypeId);
    };

})();
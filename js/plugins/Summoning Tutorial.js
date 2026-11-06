/*:
 * @plugindesc v1.00 Greys out actor commands for two actors (defaults: 14 & 15), with actor 14 also restricted to one skill, unless two switches are both ON.
 * @author Andrew
 *
 * @param Actor A ID
 * @type actor
 * @desc First restricted actor.
 * @default 14
 *
 * @param Actor A Allowed Skill Type ID
 * @type number
 * @desc Skill Type ID that stays enabled for Actor A.
 * @default 2
 *
 * @param Actor A Allowed Skill ID
 * @type skill
 * @desc The only skill within Actor A's allowed Skill Type that stays enabled.
 * @default 199
 *
 * @param Actor B ID
 * @type actor
 * @desc Second restricted actor.
 * @default 15
 *
 * @param Actor B Allowed Skill Type ID
 * @type number
 * @desc Skill Type ID that stays enabled for Actor B. All skills within it stay enabled.
 * @default 8
 *
 * @param Unlock Switch 1
 * @type switch
 * @desc First switch. Both switches must be ON to fully unlock all commands for both actors.
 * @default 4988
 *
 * @param Unlock Switch 2
 * @type switch
 * @desc Second switch. Both switches must be ON to fully unlock all commands for both actors.
 * @default 4989
 *
 * @help
 * ============================================================================
 * Andrew_GreySealActorCommands_14_15.js
 * ============================================================================
 *
 * This plugin greys out (disables, but keeps VISIBLE) commands in the Actor
 * Command Window for two specific actors, rather than removing them. It
 * replaces the older "hide entirely" approach so that Actor 14 and Actor 15
 * can share one consistent, compatible ruleset.
 *
 * ACTOR A (default: 14)
 *   - Attack, Guard, and Item commands: always greyed out while sealed.
 *   - Skill Type commands: only "Actor A Allowed Skill Type ID" (default 2)
 *     stays enabled. All other skill types are greyed out.
 *   - Once the Skill Type 2 list is opened in battle, every skill in that
 *     list is greyed out EXCEPT "Actor A Allowed Skill ID" (default 199).
 *     (Skill 199 is still subject to normal usability checks, e.g. MP cost.)
 *
 * ACTOR B (default: 15)
 *   - Attack, Guard, and Item commands: always greyed out while sealed.
 *   - Skill Type commands: only "Actor B Allowed Skill Type ID" (default 8)
 *     stays enabled. All other skill types are greyed out.
 *   - All skills within that allowed skill type behave normally (no
 *     per-skill restriction, unlike Actor A).
 *
 * UNLOCKING
 *   Both actors fully unlock (all commands and skills behave completely
 *   normally) whenever BOTH "Unlock Switch 1" AND "Unlock Switch 2" are ON.
 *   If either switch is OFF, both actors' seals are back in effect.
 *
 * No other actors are affected in any way.
 *
 * ----------------------------------------------------------------------------
 * Plugin Placement
 * ----------------------------------------------------------------------------
 * Place this plugin BELOW YEP_BattleEngineCore.js and any other plugin that
 * adds commands to the Actor Command Window or Battle Skill window (e.g.
 * YEP_X_ActorCommandEX, YEP_SkillCore), so this plugin has final say on
 * enabled/disabled state.
 *
 * This plugin replaces any earlier "seal actor 15" plugin that removed
 * commands outright -- do not use both at the same time.
 *
 * ============================================================================
 */

(function() {

    var params = PluginManager.parameters('Andrew_GreySealActorCommands_14_15');

    var actorAId = Number(params['Actor A ID'] || 14);
    var actorAAllowedSkillType = Number(params['Actor A Allowed Skill Type ID'] || 2);
    var actorAAllowedSkillId = Number(params['Actor A Allowed Skill ID'] || 199);

    var actorBId = Number(params['Actor B ID'] || 15);
    var actorBAllowedSkillType = Number(params['Actor B Allowed Skill Type ID'] || 8);

    var unlockSwitch1 = Number(params['Unlock Switch 1'] || 4988);
    var unlockSwitch2 = Number(params['Unlock Switch 2'] || 4989);

    function isUnlocked() {
        return $gameSwitches.value(unlockSwitch1) && $gameSwitches.value(unlockSwitch2);
    }

    // Returns the restriction config for this actor, or null if the actor
    // is not one of the two restricted actors.
    function getConfig(actor) {
        if (!actor) return null;
        if (actor.actorId() === actorAId) {
            return {
                allowedSkillType: actorAAllowedSkillType,
                allowedSkillId: actorAAllowedSkillId
            };
        }
        if (actor.actorId() === actorBId) {
            return {
                allowedSkillType: actorBAllowedSkillType,
                allowedSkillId: null
            };
        }
        return null;
    }

    function isSealedActor(actor) {
        var config = getConfig(actor);
        return !!config && !isUnlocked();
    }

    function disableLastCommandIfSealed(win, actor, lengthBefore) {
        if (!isSealedActor(actor)) return;
        if (win._list.length > lengthBefore) {
            win._list[win._list.length - 1].enabled = false;
        }
    }

    //--------------------------------------------------------------------------
    // Actor Command Window - Attack / Guard / Item

    var _Window_ActorCommand_addAttackCommand =
        Window_ActorCommand.prototype.addAttackCommand;
    Window_ActorCommand.prototype.addAttackCommand = function() {
        var lengthBefore = this._list.length;
        _Window_ActorCommand_addAttackCommand.call(this);
        disableLastCommandIfSealed(this, this._actor, lengthBefore);
    };

    var _Window_ActorCommand_addGuardCommand =
        Window_ActorCommand.prototype.addGuardCommand;
    Window_ActorCommand.prototype.addGuardCommand = function() {
        var lengthBefore = this._list.length;
        _Window_ActorCommand_addGuardCommand.call(this);
        disableLastCommandIfSealed(this, this._actor, lengthBefore);
    };

    var _Window_ActorCommand_addItemCommand =
        Window_ActorCommand.prototype.addItemCommand;
    Window_ActorCommand.prototype.addItemCommand = function() {
        var lengthBefore = this._list.length;
        _Window_ActorCommand_addItemCommand.call(this);
        disableLastCommandIfSealed(this, this._actor, lengthBefore);
    };

    //--------------------------------------------------------------------------
    // Actor Command Window - Skill Types

    var _Window_ActorCommand_addSkillCommands =
        Window_ActorCommand.prototype.addSkillCommands;
    Window_ActorCommand.prototype.addSkillCommands = function() {
        var config = getConfig(this._actor);
        if (!config || isUnlocked()) {
            _Window_ActorCommand_addSkillCommands.call(this);
            return;
        }
        var stypes = this._actor.addedSkillTypes().slice().sort(function(a, b) {
            return a - b;
        });
        stypes.forEach(function(stypeId) {
            var typeName = $dataSystem.skillTypes[stypeId];
            var enabled = (stypeId === config.allowedSkillType);
            this.addCommand(typeName, 'skill', enabled, stypeId);
        }, this);
    };

    //--------------------------------------------------------------------------
    // Battle Skill List Window - per-skill restriction (Actor A only)

    var _Window_BattleSkill_isEnabled = Window_BattleSkill.prototype.isEnabled;
    Window_BattleSkill.prototype.isEnabled = function(item) {
        var config = getConfig(this._actor);
        if (config && config.allowedSkillId && isSealedActor(this._actor) &&
            this._stypeId === config.allowedSkillType) {
            if (!item || item.id !== config.allowedSkillId) return false;
        }
        return _Window_BattleSkill_isEnabled.call(this, item);
    };

})();
/*:
 * @plugindesc v1.00 Seals all Actor Command Window commands for a specific actor except one Skill Type, unless two switches are both ON.
 * @author Andrew
 *
 * @param Actor ID
 * @type actor
 * @desc The actor whose commands should be sealed.
 * @default 15
 *
 * @param Allowed Skill Type ID
 * @type number
 * @desc The Skill Type ID (Database > Types > Skill Types) that stays usable even while sealed.
 * @default 8
 *
 * @param Unlock Switch 1
 * @type switch
 * @desc First switch. Both switches must be ON to fully unlock all commands.
 * @default 4988
 *
 * @param Unlock Switch 2
 * @type switch
 * @desc Second switch. Both switches must be ON to fully unlock all commands.
 * @default 4989
 *
 * @help
 * ============================================================================
 * Andrew_SealActor15ExceptSkillType8.js
 * ============================================================================
 *
 * For the actor specified by "Actor ID" (default: 15), this plugin seals
 * every command in the Actor Command Window -- Attack, Guard, Item, and
 * every Skill Type -- EXCEPT the Skill Type specified by
 * "Allowed Skill Type ID" (default: 8).
 *
 * While sealed, that actor's command window will show ONLY the allowed
 * skill type command (if the actor actually has that skill type). Attack,
 * Guard, Item, and all other skill types are simply not added to the
 * window.
 *
 * The seal is lifted completely -- the actor behaves with fully normal
 * commands -- whenever BOTH "Unlock Switch 1" AND "Unlock Switch 2" are ON.
 * If either switch is OFF, sealing is back in effect.
 *
 * No other actors are affected in any way.
 *
 * This does NOT use state-based <Seal Attack>/<Seal Skill Type: x> notetags;
 * it filters commands directly in Window_ActorCommand, so it works whether
 * or not the actor has any seal states applied.
 *
 * ----------------------------------------------------------------------------
 * Plugin Placement
 * ----------------------------------------------------------------------------
 * Place this plugin BELOW YEP_BattleEngineCore.js, and below any other
 * plugin that adds commands to the Actor Command Window (e.g.
 * YEP_X_ActorCommandEX, YEP_X_BattleSysATB), so this plugin's overrides
 * are the last word on what gets added.
 *
 * ============================================================================
 */

(function() {

    var params = PluginManager.parameters('Andrew_SealActor15ExceptSkillType8');
    var sealedActorId = Number(params['Actor ID'] || 15);
    var allowedSkillTypeId = Number(params['Allowed Skill Type ID'] || 8);
    var unlockSwitch1 = Number(params['Unlock Switch 1'] || 4988);
    var unlockSwitch2 = Number(params['Unlock Switch 2'] || 4989);

    function isUnlocked() {
        return $gameSwitches.value(unlockSwitch1) && $gameSwitches.value(unlockSwitch2);
    }

    function isSealedActor(actor) {
        return !!actor && actor.actorId() === sealedActorId && !isUnlocked();
    }

    //--------------------------------------------------------------------------
    // Attack

    var _Window_ActorCommand_addAttackCommand =
        Window_ActorCommand.prototype.addAttackCommand;
    Window_ActorCommand.prototype.addAttackCommand = function() {
        if (isSealedActor(this._actor)) return;
        _Window_ActorCommand_addAttackCommand.call(this);
    };

    //--------------------------------------------------------------------------
    // Guard

    var _Window_ActorCommand_addGuardCommand =
        Window_ActorCommand.prototype.addGuardCommand;
    Window_ActorCommand.prototype.addGuardCommand = function() {
        if (isSealedActor(this._actor)) return;
        _Window_ActorCommand_addGuardCommand.call(this);
    };

    //--------------------------------------------------------------------------
    // Item

    var _Window_ActorCommand_addItemCommand =
        Window_ActorCommand.prototype.addItemCommand;
    Window_ActorCommand.prototype.addItemCommand = function() {
        if (isSealedActor(this._actor)) return;
        _Window_ActorCommand_addItemCommand.call(this);
    };

    //--------------------------------------------------------------------------
    // Skill Types

    var _Window_ActorCommand_addSkillCommands =
        Window_ActorCommand.prototype.addSkillCommands;
    Window_ActorCommand.prototype.addSkillCommands = function() {
        if (!isSealedActor(this._actor)) {
            _Window_ActorCommand_addSkillCommands.call(this);
            return;
        }
        if (!this._actor) return;
        var stypes = this._actor.addedSkillTypes().slice().sort(function(a, b) {
            return a - b;
        });
        stypes.forEach(function(stypeId) {
            if (stypeId !== allowedSkillTypeId) return;
            var typeName = $dataSystem.skillTypes[stypeId];
            this.addCommand(typeName, 'skill', true, stypeId);
        }, this);
    };

})();
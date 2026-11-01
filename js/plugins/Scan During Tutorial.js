//=============================================================================
// Andrew_TeleportsCommand.js
//=============================================================================
// Version 1.01

/*:
 * @plugindesc v1.01 Adds a "Teleports" command to the bottom of the battle
 * party command window that opens an actor's skill list for one skill type.
 * @author Andrew
 *
 * @param Command Name
 * @text Command Name
 * @type string
 * @desc Text shown in the party command window.
 * @default Teleports
 *
 * @param Enable Switch
 * @text Enable Switch
 * @type switch
 * @desc The command is grayed out (sealed) unless this switch is ON.
 * @default 407
 *
 * @param Actor ID
 * @text Actor ID
 * @type actor
 * @desc Whose skill list is opened normally. Fallback uses Actors 2 and 3.
 * @default 1
 *
 * @param Skill Type ID
 * @text Skill Type ID
 * @type number
 * @min 1
 * @desc Which skill type is listed.
 * @default 13
 *
 * @param Fallback State ID
 * @text Fallback State ID
 * @type state
 * @desc State that causes the Teleports command to fall back to the next actor.
 * @default 1
 *
 * @help
 * ============================================================================
 * Andrew_TeleportsCommand
 * ============================================================================
 * Adds a command to the END of the party command window in battle.
 *
 *  - OK      : opens the battle skill window for the appropriate actor and
 *              skill type, exactly like choosing that skill type from that
 *              actor's own command window. The chosen skill is set as that
 *              actor's action and normal battle input continues from there.
 *
 *  - Cancel  : closes the skill window and returns to the party command
 *              window with the cursor still on this command.
 *
 * The command is sealed (grayed out) unless the Enable Switch is ON.
 *
 * Actor fallback:
 *
 *  - Actor 1 is used normally.
 *  - If Actor 1 has the Fallback State, Actor 2 is used.
 *  - If Actors 1 and 2 have the Fallback State, Actor 3 is used.
 *  - If Actors 1, 2, and 3 all have the Fallback State, the command is
 *    disabled.
 *
 * The selected actor must also:
 *
 *  - Be in the battle party.
 *  - Be able to input a command.
 *  - Have an inputting action.
 *
 * The fallback actor is evaluated each time the party command window opens
 * and is also re-evaluated when the Teleports command is selected.
 *
 * Load order: place this BELOW YEP_BattleEngineCore and any plugin that adds
 * other party commands (so this one lands at the bottom).
 *
 * Note: the chosen skill becomes the selected actor's action, and input
 * continues with the party member after them. Members ahead of that actor in
 * battle order get no command that turn, so this is intended for an actor
 * who is first in battle order.
 */

(function() {
    'use strict';

    //-------------------------------------------------------------------------
    // Plugin parameters
    //-------------------------------------------------------------------------

    // Self-detect filename so PluginManager.parameters() always matches
    var scriptName = (function() {
        var src = (document.currentScript && document.currentScript.src) || '';
        var m = src.match(/([^\/\\]+)\.js(\?.*)?$/);
        return m ? decodeURIComponent(m[1]) : 'Andrew_TeleportsCommand';
    })();

    var params = PluginManager.parameters(scriptName);

    var COMMAND_NAME = String(params['Command Name'] || 'Teleports');
    var SWITCH_ID = Number(params['Enable Switch'] || 407);
    var ACTOR_ID = Number(params['Actor ID'] || 1);
    var STYPE_ID = Number(params['Skill Type ID'] || 13);
    var FALLBACK_STATE_ID = Number(params['Fallback State ID'] || 1);
    var SYMBOL = 'andrewTeleports';

    //-------------------------------------------------------------------------
    // Determine which actor should handle the Teleports command
    //-------------------------------------------------------------------------

    // Actor priority:
    // Actor 1 -> Actor 2 -> Actor 3
    //
    // An actor is skipped if:
    // 1. They have the fallback state.
    // 2. They are not in the battle party.
    // 3. They cannot currently input a command.
    // 4. They do not have an inputting action.
    //
    // This means that if Actor 1 has State 1, the command moves to Actor 2.
    // If Actors 1 and 2 have State 1, it moves to Actor 3.
    // If all three have State 1, no actor is returned.

    function teleportActor() {
        var actorIds = [ACTOR_ID, 2, 3];

        for (var i = 0; i < actorIds.length; i++) {
            var actorId = actorIds[i];

            // Avoid checking the same actor twice if the Actor ID parameter
            // happens to be set to 2 or 3.
            if (i > 0 && actorIds.indexOf(actorId) < i) {
                continue;
            }

            var actor = $gameActors.actor(actorId);

            if (!actor) {
                continue;
            }

            // Skip actors who have the fallback state.
            if (actor.isStateAffected(FALLBACK_STATE_ID)) {
                continue;
            }

            // Actor must be in the current battle party.
            if ($gameParty.members().indexOf(actor) < 0) {
                continue;
            }

            // Actor must currently be able to input.
            if (!actor.canInput()) {
                continue;
            }

            // Actor must have an inputting action.
            if (!actor.inputtingAction()) {
                continue;
            }

            return actor;
        }

        return null;
    }

    //-------------------------------------------------------------------------
    // Get the battle-party index of the selected Teleports actor
    //-------------------------------------------------------------------------

    function teleportActorIndex() {
        var actor = teleportActor();
        return actor ? $gameParty.members().indexOf(actor) : -1;
    }

    //-------------------------------------------------------------------------
    // Determine whether the party command should be enabled
    //-------------------------------------------------------------------------

    function isTeleportsEnabled() {
        // Master enable switch must be ON.
        if (!$gameSwitches.value(SWITCH_ID)) {
            return false;
        }

        // Find the first eligible actor.
        var actor = teleportActor();

        // No eligible actor means the command is disabled.
        if (!actor) {
            return false;
        }

        return !!(
            teleportActorIndex() >= 0 &&
            actor.canInput() &&
            actor.inputtingAction()
        );
    }

    //-------------------------------------------------------------------------
    // Window_PartyCommand: append the command
    //-------------------------------------------------------------------------

    var _Window_PartyCommand_makeCommandList =
        Window_PartyCommand.prototype.makeCommandList;

    Window_PartyCommand.prototype.makeCommandList = function() {
        _Window_PartyCommand_makeCommandList.call(this);

        this.addCommand(
            COMMAND_NAME,
            SYMBOL,
            isTeleportsEnabled()
        );
    };

    //-------------------------------------------------------------------------
    // Scene_Battle: handler
    //-------------------------------------------------------------------------

    var _Scene_Battle_createPartyCommandWindow =
        Scene_Battle.prototype.createPartyCommandWindow;

    Scene_Battle.prototype.createPartyCommandWindow = function() {
        _Scene_Battle_createPartyCommandWindow.call(this);

        this._partyCommandWindow.setHandler(
            SYMBOL,
            this.commandAndrewTeleports.bind(this)
        );
    };

    //-------------------------------------------------------------------------
    // Open the Teleports skill window
    //-------------------------------------------------------------------------

    Scene_Battle.prototype.commandAndrewTeleports = function() {

        // Re-evaluate the fallback actor when the command is actually chosen.
        // This protects against a state changing after the party command list
        // was initially created.
        var actor = teleportActor();
        var index = teleportActorIndex();

        if (!actor || index < 0 || !actor.inputtingAction()) {
            this._partyCommandWindow.activate();
            return;
        }

        // Make the actor the "current" battler, as if their own command
        // window were open, so the normal skill flow works unchanged.
        this._andrewTeleportActive = true;

        BattleManager._actorIndex = index;

        actor.setActionState('inputting');

        this._statusWindow.select(index);

        this._skillWindow.setActor(actor);

        this._skillWindow.setStypeId(STYPE_ID);

        this._skillWindow.refresh();

        this._skillWindow.show();

        this._skillWindow.activate();
    };

    //-------------------------------------------------------------------------
    // Cancel the Teleports skill window
    //-------------------------------------------------------------------------

    Scene_Battle.prototype.andrewTeleportsCancel = function() {

        var actor = BattleManager.actor();

        this._andrewTeleportActive = false;

        this._skillWindow.hide();

        if (actor) {
            actor.setActionState('undecided');
        }

        BattleManager._actorIndex = -1;

        this._statusWindow.deselect();

        // Party window was never closed or re-setup, so its cursor is still
        // on this command.
        this._partyCommandWindow.activate();
    };

    //-------------------------------------------------------------------------
    // Cancel routing while the teleport flow is active
    //-------------------------------------------------------------------------

    var _Scene_Battle_onSkillCancel =
        Scene_Battle.prototype.onSkillCancel;

    Scene_Battle.prototype.onSkillCancel = function() {

        if (this._andrewTeleportActive) {
            this.andrewTeleportsCancel();
            return;
        }

        _Scene_Battle_onSkillCancel.call(this);
    };

    //-------------------------------------------------------------------------
    // Cancelling target selection returns to the skill window
    //-------------------------------------------------------------------------

    // The stock handlers look at the actor command window's cursor, which
    // isn't in use during the Teleports flow.

    ['onActorCancel', 'onEnemyCancel'].forEach(function(name) {

        var original = Scene_Battle.prototype[name];

        Scene_Battle.prototype[name] = function() {

            if (this._andrewTeleportActive) {

                this._actorWindow.hide();

                this._enemyWindow.hide();

                this._skillWindow.show();

                this._skillWindow.activate();

                return;
            }

            original.call(this);
        };
    });

    //-------------------------------------------------------------------------
    // Input has moved on -> flow is finished
    //-------------------------------------------------------------------------

    var _Scene_Battle_changeInputWindow =
        Scene_Battle.prototype.changeInputWindow;

    Scene_Battle.prototype.changeInputWindow = function() {

        this._andrewTeleportActive = false;

        _Scene_Battle_changeInputWindow.call(this);
    };

})();
/*:
 * @plugindesc Cleans up lingering battle state after YEP_InstantCast and aborted battles. v1.0
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Purpose
 * ============================================================================
 *
 * This plugin attempts to prevent battle freezes caused by lingering
 * battle state after using YEP_InstantCast, especially when:
 *
 * - battles are aborted
 * - enemies die mid-instant-action
 * - troop events interrupt actions
 * - forced actions occur
 * - common events end battles early
 * - escape events occur during instant actions
 *
 * It does this by sanitizing transient BattleManager state both:
 *
 * 1. when a battle ends
 * 2. when a new battle begins
 *
 * ============================================================================
 * Installation
 * ============================================================================
 *
 * Place BELOW:
 *   - YEP_BattleEngineCore
 *   - YEP_InstantCast
 *
 * ============================================================================
 * Compatibility
 * ============================================================================
 *
 * Safe for most RPG Maker MV projects.
 *
 * Does NOT:
 * - alter damage formulas
 * - alter turn order
 * - alter action execution
 * - modify instant cast logic directly
 *
 * Only clears transient battle state that should never persist
 * between battles.
 *
 * ============================================================================
 */

(function() {
    'use strict';

    //-------------------------------------------------------------------------
    // Core Cleanup
    //-------------------------------------------------------------------------

    BattleManager.clearInstantCastState = function() {

        // Current acting battler
        this._subject = null;

        // Forced action cleanup
        this._actionForcedBattler = null;
        this._processingForcedAction = false;

        // Action queues
        this._actionBattlers = [];

        // Actor input tracking
        this._actorIndex = -1;

        // Safety flags
        this._targets = [];
        this._turnForced = false;

        // Clear party actions
        if ($gameParty && $gameParty.members) {
            $gameParty.members().forEach(function(actor) {
                if (actor) {
                    actor.clearActions();
                    actor.setActionState('undecided');
                }
            });
        }

        // Clear troop actions
        if ($gameTroop && $gameTroop.members) {
            $gameTroop.members().forEach(function(enemy) {
                if (enemy) {
                    enemy.clearActions();
                    enemy.setActionState('');
                }
            });
        }
    };

    //-------------------------------------------------------------------------
    // Cleanup After Battle Ends
    //-------------------------------------------------------------------------

    const _BattleManager_endBattle = BattleManager.endBattle;

    BattleManager.endBattle = function(result) {

        _BattleManager_endBattle.call(this, result);

        this.clearInstantCastState();
    };

    //-------------------------------------------------------------------------
    // Cleanup Before New Battle Starts
    //-------------------------------------------------------------------------

    const _BattleManager_setup = BattleManager.setup;

    BattleManager.setup = function(troopId, canEscape, canLose) {

        this.clearInstantCastState();

        _BattleManager_setup.call(this, troopId, canEscape, canLose);

        this.clearInstantCastState();
    };

    //-------------------------------------------------------------------------
    // Emergency Recovery During Battle Scene Start
    //-------------------------------------------------------------------------

    const _Scene_Battle_start = Scene_Battle.prototype.start;

    Scene_Battle.prototype.start = function() {

        BattleManager.clearInstantCastState();

        _Scene_Battle_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Additional Forced Action Recovery
    //-------------------------------------------------------------------------

    const _BattleManager_processForcedAction =
        BattleManager.processForcedAction;

    BattleManager.processForcedAction = function() {

        try {
            _BattleManager_processForcedAction.call(this);
        } catch (e) {

            console.error(
                'InstantCast Recovery: Forced Action crashed.',
                e
            );

            this._processingForcedAction = false;
            this._actionForcedBattler = null;
            this._subject = null;
        }
    };

})();
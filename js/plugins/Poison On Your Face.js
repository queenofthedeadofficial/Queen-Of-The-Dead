/*:
 * @plugindesc Turns OFF switch 482 whenever State 4 is removed from an actor, excluding end-of-battle removal.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Purpose
 * ============================================================================
 * Turns OFF switch 482 whenever State 4 is removed from an actor,
 * except when the state is removed automatically at battle end.
 *
 * Includes:
 * - Recovery skills
 * - Items
 * - Auto-removal by turns
 * - Script removal
 * - Death cleanup
 *
 * Excludes:
 * - Remove at Battle End
 * ============================================================================
 */

(function() {
    'use strict';

    const TARGET_STATE_ID = 4;
    const TARGET_SWITCH_ID = 482;

    let _removingBattleStates = false;

    // Detect battle-end cleanup phase
    const _Game_Battler_removeBattleStates =
        Game_Battler.prototype.removeBattleStates;

    Game_Battler.prototype.removeBattleStates = function() {
        _removingBattleStates = true;
        _Game_Battler_removeBattleStates.call(this);
        _removingBattleStates = false;
    };

    const _Game_Battler_removeState =
        Game_Battler.prototype.removeState;

    Game_Battler.prototype.removeState = function(stateId) {

        const shouldTrigger =
            this.isActor() &&
            !_removingBattleStates &&
            stateId === TARGET_STATE_ID &&
            this.isStateAffected(stateId);

        _Game_Battler_removeState.call(this, stateId);

        if (shouldTrigger) {
            $gameSwitches.setValue(TARGET_SWITCH_ID, false);
        }
    };

})();
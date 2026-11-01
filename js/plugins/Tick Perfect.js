/*:
 * @plugindesc Turns OFF switch 478 whenever an actor takes damage from State 4 via YEP_X_ExtDoT.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Requirements
 * ============================================================================
 * Place BELOW:
 * - YEP_BattleEngineCore
 * - YEP_BuffsStatesCore
 * - YEP_X_ExtDoT
 *
 * ============================================================================
 * What It Does
 * ============================================================================
 * Whenever State 4 deals HP damage to an actor through ExtDoT,
 * switch 478 is turned OFF.
 * ============================================================================
 */

(function() {
    'use strict';

    const STATE_ID = 4;
    const SWITCH_ID = 478;

    const _processDamageOverTimeStateEffect =
        Game_Battler.prototype.processDamageOverTimeStateEffect;

    Game_Battler.prototype.processDamageOverTimeStateEffect = function(state) {

        const hpBefore = this.hp;

        _processDamageOverTimeStateEffect.call(this, state);

        // Only care about actors + State 4
        if (!this.isActor()) return;
        if (!state || state.id !== STATE_ID) return;

        // HP decreased = DoT damage occurred
        if (this.hp < hpBefore) {
            $gameSwitches.setValue(SWITCH_ID, false);
        }
    };

})();
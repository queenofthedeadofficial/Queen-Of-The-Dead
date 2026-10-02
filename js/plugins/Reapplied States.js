//=============================================================================
// Andrew_ReappliedStateMessage.js
//=============================================================================

/*:
 * @plugindesc v1.00 Overrides the state message when a state is applied to a
 * battler that already has it.
 * @author Andrew
 *
 * @help
 * -----------------------------------------------------------------------------
 * Andrew_ReappliedStateMessage.js
 * -----------------------------------------------------------------------------
 * By default, RPG Maker MV replays the normal "state added" message
 * (state.message1 / state.message2) every time a state is applied, even if
 * the target was already affected by it. This plugin detects that specific
 * case - state already present at the moment addState is called - and shows
 * a different message instead:
 *
 *   - "But it had no effect!" for any state
 *   - "X's barrier was strengthened!" specifically for state 283
 *
 * If the target did NOT already have the state, the normal message1/message2
 * text defined on the state itself is shown as usual. Nothing changes for
 * brand-new state applications.
 *
 * -----------------------------------------------------------------------------
 * Compatibility / Load Order
 * -----------------------------------------------------------------------------
 * This plugin aliases:
 *   - Game_Battler.prototype.addState
 *   - Window_BattleLog.prototype.displayAddedStates
 *
 * Place this BELOW YEP_BuffsStatesCore and YEP_X_ExtDoT (and any other
 * plugin that touches state application/messages) so this plugin's alias
 * wraps theirs. If another plugin fully redefines displayAddedStates instead
 * of aliasing it, load this one below that plugin as well.
 *
 * No plugin commands, no parameters.
 * -----------------------------------------------------------------------------
 */

(function() {

    var STATE_ID_BARRIER = 283;

    //-------------------------------------------------------------------------
    // Game_Battler
    //
    // Track, per battler, which states were already active at the moment
    // addState was called this action (i.e. "reapplied" rather than newly
    // added). We only flag it if the base addState call actually registered
    // the state as added to the result (isStateAdded) - if the state was
    // resisted/blocked, isStateAddable will be false and nothing should
    // display anyway.
    //-------------------------------------------------------------------------

    var _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function(stateId) {
        var wasAlreadyAffected = this.isStateAffected(stateId);
        _Game_Battler_addState.call(this, stateId);
        if (wasAlreadyAffected && this._result.isStateAdded(stateId)) {
            if (!this._reappliedStates) {
                this._reappliedStates = [];
            }
            if (this._reappliedStates.indexOf(stateId) < 0) {
                this._reappliedStates.push(stateId);
            }
        }
    };

    //-------------------------------------------------------------------------
    // Window_BattleLog
    //
    // Reproduce the default displayAddedStates loop, but swap in the
    // "reapplied" message for any state id flagged above. Falls straight
    // through to the original method if nothing was flagged for this target,
    // so unrelated plugins that alias displayAddedStates still run normally
    // in the common case.
    //-------------------------------------------------------------------------

    var _Window_BattleLog_displayAddedStates = Window_BattleLog.prototype.displayAddedStates;
    Window_BattleLog.prototype.displayAddedStates = function(target) {
        var reapplied = target._reappliedStates || [];
        if (reapplied.length === 0) {
            _Window_BattleLog_displayAddedStates.call(this, target);
            return;
        }

        target.result().addedStateObjects().forEach(function(state) {
            if (state.id === target.deathStateId()) {
                this.push('performCollapse', target);
            }

            var stateText;
            if (reapplied.indexOf(state.id) >= 0) {
                if (state.id === STATE_ID_BARRIER) {
                    stateText = "%1's barrier was strengthened!";
                } else {
                    stateText = "But it had no effect!";
                }
            } else {
                stateText = target.isActor() ? state.message1 : state.message2;
            }

            if (stateText) {
                this.push('popBaseLine');
                this.push('pushBaseLine');
                this.push('addText', stateText.format(target.name()));
                this.push('waitForEffect');
                this.push('popBaseLine');
            }
        }, this);

        target._reappliedStates = [];
    };

})();
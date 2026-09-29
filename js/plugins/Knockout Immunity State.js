//=============================================================================
// Andrew_PreRegenState.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_PreRegenState = true;

var Andrew = Andrew || {};
Andrew.PreRegenState = Andrew.PreRegenState || {};

/*:
 * @plugindesc v1.00 Applies a state to a battler at the start of the regen
 * phase, before regen HP/MP/TP effects are calculated.
 * @author Andrew
 *
 * @param State ID
 * @type state
 * @desc The state to apply before regen effects occur.
 * @default 113
 *
 * @help
 * ============================================================================
 * Andrew_PreRegenState.js
 * ============================================================================
 *
 * Applies the configured state to a battler at the very start of
 * Game_Battler.prototype.regenerateAll, before regenerateHp/Mp/Tp run.
 *
 * Only affects battlers that are alive (matches vanilla's own isAlive()
 * gate inside regenerateAll).
 *
 * ----------------------------------------------------------------------------
 * Load Order
 * ----------------------------------------------------------------------------
 * Place this ABOVE Andrew_NetDoTHoTPopup.js (and any other plugin that also
 * aliases regenerateAll) if you want the state to already be present when
 * those plugins evaluate the battler for that regen tick. Aliases execute in
 * load order — whichever plugin is loaded first runs its "before" logic
 * first.
 *
 * If you are also using Andrew_ZeroHpState.js, make sure its regen-phase
 * suppression flag is active by the time this plugin's addState() call
 * triggers refresh() internally, since addState() calls refresh() before
 * regen math actually runs this frame.
 *
 * ============================================================================
 */

(function() {

    var pluginName = 'Andrew_PreRegenState';
    var parameters = PluginManager.parameters(pluginName);
    var stateId = Number(parameters['State ID'] || 113);

    Andrew.PreRegenState.Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;
    Game_Battler.prototype.regenerateAll = function() {
        if (this.isAlive()) {
            this.addState(stateId);
        }
        Andrew.PreRegenState.Game_Battler_regenerateAll.call(this);
    };

})();
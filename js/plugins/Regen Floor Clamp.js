//=============================================================================
// Andrew_RegenPhaseHpFloor.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_RegenPhaseHpFloor = true;

var Andrew = Andrew || {};
Andrew.RegenPhaseHpFloor = Andrew.RegenPhaseHpFloor || {};

/*:
 * @plugindesc v1.02 Widens the HP clamp floor from 0 to a configurable
 * negative value (default -99) while a battler's regen phase is active.
 * Requires Andrew_RegenPhaseCore.js.
 * @author Andrew
 *
 * @param Minimum HP
 * @type number
 * @min -9999
 * @max 0
 * @desc The HP floor to use during the regen phase. Must be 0 or lower.
 * @default -99
 *
 * @help
 * ============================================================================
 * Andrew_RegenPhaseHpFloor.js
 * ============================================================================
 *
 * Vanilla Game_BattlerBase.prototype.refresh clamps HP to [0, mhp] every
 * time it runs -- and it runs on every setHp/gainHp call, not once per
 * turn. During a regen phase with multiple sequential HP changes (DoT
 * ticks, HoT ticks, this project's poison-pair heal, etc.), that means
 * any dip below 0 gets truncated to 0 the instant it happens, discarding
 * how far negative it actually would have gone before the next effect
 * in the same phase runs. Anything downstream that reasons about "how
 * much more healing is needed" or "how much overkill happened" only
 * ever sees 0, never the true magnitude.
 *
 * This plugin widens the floor to a configurable negative value (default
 * -99) for the duration of the regen phase only, then lets it snap back
 * to the normal 0 floor once the phase ends -- so nothing outside the
 * regen phase (KO checks, gauges, damage formulas, etc.) ever sees a
 * negative HP value; they only ever see the final, properly-clamped
 * result.
 *
 * ----------------------------------------------------------------------------
 * Why Game_Battler.prototype.refresh, not Game_BattlerBase's
 * ----------------------------------------------------------------------------
 * v1.01 and earlier aliased Game_BattlerBase.prototype.refresh directly
 * (the method that actually contains the clamp line). That's one
 * prototype level below where Andrew_ZeroHpState.js aliases refresh
 * (Game_Battler.prototype.refresh). If Andrew_ZeroHpState.js happened
 * to load first, it would capture a reference to vanilla refresh
 * *before* this plugin ever touched Game_BattlerBase.prototype.refresh
 * (JS resolves Game_Battler.prototype.refresh via the prototype chain
 * when Game_Battler.prototype has no own copy yet) -- permanently
 * locking that stale reference into Andrew_ZeroHpState.js's own
 * wrapper. This plugin's later override to Game_BattlerBase.prototype
 * would then never be reached through a normal battler.refresh() call,
 * silently making the whole floor-widening feature dead code. Aliasing
 * at the same level as Andrew_ZeroHpState.js instead means the two
 * compose through the standard, predictable "last-loaded plugin wraps
 * everything before it" alias chain, with no cross-level shadowing risk
 * regardless of load order.
 *
 * ----------------------------------------------------------------------------
 * Requires Andrew_ZeroHpState.js v2.00+ (RegenPhase-aware)
 * ----------------------------------------------------------------------------
 * Even with the level fix above, this plugin's own regenerateAll
 * wrapper finalizes (calls Andrew.RegenPhase.exit, which snaps the
 * floor back to normal once depth hits 0) as soon as ITS OWN wrapper
 * returns. If Andrew_ZeroHpState.js still wraps AROUND this plugin but
 * isn't itself incrementing/decrementing the same shared counter, the
 * floor would snap back before Andrew_ZeroHpState.js's own phase
 * actually finishes. Andrew_ZeroHpState.js v2.00+ joins the same
 * Andrew.RegenPhase counter, so depth only truly reaches 0 once every
 * participating plugin -- including it -- has finished, regardless of
 * which one loaded last.
 * ----------------------------------------------------------------------------
 * Dependency
 * ----------------------------------------------------------------------------
 * Requires Andrew_RegenPhaseCore.js to be loaded ABOVE this plugin.
 * Works standalone (no other Andrew_ regen plugins required), and
 * composes correctly with any of them regardless of load order, as
 * long as every participant uses Andrew.RegenPhase rather than a
 * private flag of its own.
 *
 * ----------------------------------------------------------------------------
 * Load Order
 * ----------------------------------------------------------------------------
 * No particular position relative to Andrew_ZeroHpState.js,
 * Andrew_NetRegenHp.js, or Andrew_PoisonPairHeal.js is required for
 * this plugin's own correctness -- Andrew.RegenPhase's depth counter
 * means it doesn't matter which of these plugins ends up outermost or
 * innermost in the regenerateAll alias chain; the floor is active for
 * the full duration regardless. It only needs to load below
 * Andrew_RegenPhaseCore.js.
 *
 * ============================================================================
 */

(function() {

    var pluginName = document.currentScript.src.split('/').pop().replace(/\.js$/, '');
    var parameters = PluginManager.parameters(pluginName);
    var minHp = Number(parameters['Minimum HP'] || -99);

    Andrew.RegenPhaseHpFloor.Game_Battler_refresh = Game_Battler.prototype.refresh;
    Game_Battler.prototype.refresh = function() {
        if (Andrew.RegenPhase.active(this)) {
            var rawHp = this._hp;
            Andrew.RegenPhaseHpFloor.Game_Battler_refresh.call(this);
            this._hp = rawHp.clamp(minHp, this.mhp);
        } else {
            Andrew.RegenPhaseHpFloor.Game_Battler_refresh.call(this);
        }
    };

    // Wraps regenerateAll itself now, so the phase is correctly marked
    // even if no other Andrew_ plugin happens to be doing so -- this
    // plugin no longer depends on Andrew_ZeroHpState.js (or any other
    // plugin) to bracket the phase for it.
    Andrew.RegenPhaseHpFloor.Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;
    Game_Battler.prototype.regenerateAll = function() {
        Andrew.RegenPhase.enter(this);
        try {
            Andrew.RegenPhaseHpFloor.Game_Battler_regenerateAll.call(this);
        } finally {
            Andrew.RegenPhase.exit(this);
        }
    };

})();
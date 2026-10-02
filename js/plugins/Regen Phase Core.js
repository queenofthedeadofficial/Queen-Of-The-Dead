//=============================================================================
// Andrew_RegenPhaseCore.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_RegenPhaseCore = true;

var Andrew = Andrew || {};

/*:
 * @plugindesc v1.00 Shared, order-independent regen-phase tracking used by
 * Andrew_PoisonPairHeal.js, Andrew_RegenPhaseHpFloor.js, and (optionally)
 * Andrew_NetRegenHp.js. No parameters -- this is infrastructure only.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_RegenPhaseCore.js
 * ============================================================================
 *
 * Provides Andrew.RegenPhase, a small reentrant depth-counter (per
 * battler instance) that any plugin wrapping
 * Game_Battler.prototype.regenerateAll can use to mark "a regen phase is
 * active" without needing to know or care whether any other plugin is
 * also wrapping the same method, or in what order.
 *
 * This replaces the older approach (a single boolean flag owned by one
 * specific plugin, with that same plugin responsible for "finalizing"
 * by calling refresh() once the flag goes false). That approach broke
 * silently depending on load order: whichever plugin's wrapper was
 * innermost in the alias chain would finalize and reset the floor
 * before outer wrappers had finished their own post-processing for the
 * same phase.
 *
 * A depth counter fixes this regardless of load order: every
 * participating plugin increments on entry and decrements on exit
 * (always in a try/finally, so a thrown exception can't leave the
 * counter stuck above 0). The phase is only truly "over," and refresh()
 * only actually finalizes back to the normal floor, once the count
 * returns to 0 -- i.e. after the outermost wrapper in the actual call
 * chain finishes, whichever plugin that happens to be for a given load
 * order.
 *
 * ----------------------------------------------------------------------------
 * Usage (for any plugin wrapping regenerateAll)
 * ----------------------------------------------------------------------------
 *   Game_Battler.prototype.regenerateAll = function() {
 *       Andrew.RegenPhase.enter(this);
 *       try {
 *           // ... this plugin's own before/after logic, plus calling
 *           // the previously-aliased regenerateAll ...
 *       } finally {
 *           Andrew.RegenPhase.exit(this);
 *       }
 *   };
 *
 * Other code can check Andrew.RegenPhase.active(battler) to ask "is a
 * regen phase currently in progress for this battler," regardless of
 * how many plugins are nested at that moment.
 *
 * ----------------------------------------------------------------------------
 * Load Order
 * ----------------------------------------------------------------------------
 * Load this ABOVE any plugin that references Andrew.RegenPhase (e.g.
 * Andrew_PoisonPairHeal.js, Andrew_RegenPhaseHpFloor.js). It only
 * defines the shared object; it does not alias anything itself, so
 * there's no conflict with alias-chain ordering elsewhere.
 *
 * ============================================================================
 */

Andrew.RegenPhase = Andrew.RegenPhase || {

    enter: function(battler) {
        battler._regenPhaseDepth = (battler._regenPhaseDepth || 0) + 1;
    },

    exit: function(battler) {
        battler._regenPhaseDepth = Math.max(0, (battler._regenPhaseDepth || 0) - 1);
        if (battler._regenPhaseDepth === 0) {
            battler.refresh();
        }
    },

    active: function(battler) {
        return (battler._regenPhaseDepth || 0) > 0;
    }

};
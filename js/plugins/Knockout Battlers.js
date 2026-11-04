//=============================================================================
// Andrew_ZeroHpState.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_ZeroHpState = true;

var Andrew = Andrew || {};
Andrew.ZeroHpState = Andrew.ZeroHpState || {};
Andrew.ZeroHpState.version = 2.01;

//=============================================================================
/*:
 * @plugindesc v2.01 Currently applies no state to anyone (see Changelog
 * v2.01) -- retained only so other plugins can still participate in the
 * shared Andrew.RegenPhase counter this plugin joins.
 * Requires Andrew_RegenPhaseCore.js.
 * @author Andrew
 *
 * @param Death State ID
 * @desc The state ID to apply to battlers at 0 HP.
 * @default 1
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * During battle, if a battler's HP is 0, this plugin applies the configured
 * state (default: State 1) to them.
 *
 * The one exception is a battler's own regeneration phase
 * (Game_Battler.prototype.regenerateAll -- where DoT/HoT states tick). HP
 * can be transiently 0 partway through that phase (e.g. a DoT tick brings
 * it to 0) even though a later HoT tick in the very same phase brings it
 * back above 0 before the phase finishes. Applying the state mid-phase
 * would incorrectly flag a battler who ends the phase alive.
 *
 * ============================================================================
 * How this is checked
 * ============================================================================
 *
 * This plugin wraps Game_Battler.prototype.regenerateAll, marking the
 * whole call as "phase active" via Andrew.RegenPhase (a shared,
 * reentrant depth counter provided by Andrew_RegenPhaseCore.js -- see
 * that plugin's help text for the full rationale). Every gainHp/setHp
 * call during the phase triggers refresh(), which triggers this
 * plugin's own KO check, andrewCheckZeroHpState() -- but that check
 * skips immediately whenever Andrew.RegenPhase.active() is true, so
 * none of those mid-phase calls ever apply the state.
 *
 * The real check only happens once: when the count of every nested,
 * currently-active regenerateAll wrapper (from this plugin and any
 * other Andrew_ plugin that also participates in the same counter --
 * Andrew_RegenPhaseHpFloor.js, Andrew_PoisonPairHeal.js, etc.) returns
 * to 0, meaning the TRUE outermost phase has fully finished regardless
 * of which plugin happens to be outermost for a given load order.
 * Andrew.RegenPhase itself calls refresh() at that exact moment, which
 * runs this plugin's real, un-skipped KO check against the battler's
 * final, fully-resolved HP for that phase.
 *
 * Earlier versions (see Changelog) tried to solve this with a private
 * flag this plugin alone owned, plus various attempts to hook into
 * other specific plugins' finish-of-phase methods. Both approaches
 * broke depending on load order or which other plugins were installed,
 * because "when does the phase truly end" was never a single shared
 * fact multiple plugins could agree on -- it is now.
 *
 * ============================================================================
 * General
 * ============================================================================
 *
 * This plugin only adds the state; it does not remove it. If you also
 * want it automatically removed when HP rises back above 0 outside of
 * the regen phase, let me know and this can be added as a companion
 * check alongside the existing one.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 2.01:
 * - Removed state application for actors. The isAlive()/passiveStatesRaw()
 *   recursion risk this plugin already excluded enemies for (see the
 *   comment in andrewCheckZeroHpState) turned out to reach actors too, so
 *   this plugin no longer applies State 1 to anyone. The regenerateAll
 *   wrapping and Andrew.RegenPhase participation are unchanged -- other
 *   plugins (Andrew_RegenPhaseHpFloor.js, etc.) still depend on this
 *   plugin joining that shared counter regardless of whether it applies a
 *   state.
 *
 * Version 2.00:
 * - Replaced this plugin's own private _inRegenPhase flag (and its
 *   Andrew_NetDoTHoTPopup-specific fallback hook) with the shared,
 *   order-independent Andrew.RegenPhase counter from
 *   Andrew_RegenPhaseCore.js. This plugin now requires that file to be
 *   loaded above it.
 * - Fixed: depending on load order relative to Andrew_RegenPhaseHpFloor.js
 *   and Andrew_PoisonPairHeal.js, this plugin's own private phase
 *   tracking could finalize (reclamp HP to the normal 0 floor and/or
 *   run the KO check) at a different moment than those plugins expected
 *   the phase to actually end -- in one specific ordering, this
 *   silently made Andrew_RegenPhaseHpFloor.js's negative-HP floor
 *   completely unreachable. All participating plugins now share one
 *   counter, so there is exactly one, load-order-independent answer to
 *   "has the regen phase truly finished."
 *
 * Version 1.03:
 * - Fixed: when Andrew_NetDoTHoTPopup.js is present, the check was
 *   relying solely on that plugin's _andrewDotHotBatching flag and
 *   ignoring this plugin's own _inRegenPhase flag entirely. If that
 *   plugin's batching window didn't cover the full regen phase, the
 *   state could still be force-applied mid-phase. Both flags are now
 *   checked independently, so _inRegenPhase always suppresses the
 *   check regardless of what else is loaded.
 *
 * Version 1.02:
 * - Replaced the v1.01 hook-based recheck (which depended on this plugin
 *   loading after Andrew_NetDoTHoTPopup.js) with a per-frame check on
 *   every battle member, via Scene_Battle.prototype.update. This plugin
 *   no longer needs any particular load order relative to
 *   Andrew_NetDoTHoTPopup.js or YEP_X_ExtDoT.js to work correctly.
 *
 * Version 1.01:
 * - Fixed: the state could still be incorrectly applied mid-regen-phase
 *   (a battler dying to a DoT tick even though a same-phase HoT tick
 *   brought them back to >= 1 HP by the end).
 *
 * Version 1.00:
 * - Finished plugin.
 *
 * ============================================================================
 * Installation
 * ============================================================================
 *
 * Requires Andrew_RegenPhaseCore.js, loaded above this plugin. Beyond
 * that, no particular load-order position relative to any other
 * Andrew_ regen plugin is required -- that's the whole point of the
 * shared counter. It does still need to load below all YEP plugins per
 * this project's usual convention.
 *
 * ============================================================================
 */
//=============================================================================

Andrew.ZeroHpState.Parameters = PluginManager.parameters(document.currentScript.src
  .split('/').pop().replace(/\.js$/, ''));
Andrew.ZeroHpState.StateId =
    Number(Andrew.ZeroHpState.Parameters['Death State ID'] || 1);

//=============================================================================
// Game_Battler
//=============================================================================

// Wraps the whole regen phase using the shared, order-independent
// Andrew.RegenPhase counter (from Andrew_RegenPhaseCore.js) instead of a
// private flag this plugin owns alone. This matters because other
// plugins -- Andrew_RegenPhaseHpFloor.js in particular -- widen the HP
// clamp floor for the duration of the phase and rely on knowing exactly
// when the TRUE outermost phase ends, not just when their own wrapper
// happens to return. A private flag here that isn't part of that same
// counter would let this plugin's phase spans and another plugin's
// disagree about timing depending on load order.
Andrew.ZeroHpState.Game_Battler_regenerateAll =
    Game_Battler.prototype.regenerateAll;
Game_Battler.prototype.regenerateAll = function() {
  Andrew.RegenPhase.enter(this);
  try {
    Andrew.ZeroHpState.Game_Battler_regenerateAll.call(this);
  } finally {
    Andrew.RegenPhase.exit(this);
    // Andrew.RegenPhase.exit() already calls this.refresh() once depth
    // reaches 0 (i.e. once every participating plugin's phase, not just
    // this one, has actually finished) -- no separate manual refresh()
    // call needed here anymore.
  }
};

Andrew.ZeroHpState.Game_Battler_refresh = Game_Battler.prototype.refresh;
Game_Battler.prototype.refresh = function() {
  Andrew.ZeroHpState.Game_Battler_refresh.call(this);
  this.andrewCheckZeroHpState();
};

Game_Battler.prototype.andrewCheckZeroHpState = function() {
  // Enemies were never meant to receive this state -- see plugin help.
  // Applying State 1 (vanilla's hardcoded deathStateId()) to an enemy
  // makes isDeathStateAffected()/isAlive() resolve through the full
  // Passive Aura machinery for that enemy for the first time, which can
  // self-reference back into isAlive() while computing aura status and
  // stack-overflow.
  if (!this.isActor()) return;
  // Actor-side application removed: the same isAlive()/passiveStatesRaw
  // recursion risk documented above for enemies turned out to reach
  // actors too (see Andrew_PassiveStateRecursionGuard.js's changelog),
  // so this plugin no longer applies State 1 to anyone. The regen-phase
  // wrapping above is left in place -- Andrew_RegenPhaseHpFloor.js and
  // others still rely on this plugin's participation in the shared
  // Andrew.RegenPhase counter regardless of whether it applies a state.
  return;
};

//=============================================================================
// End of File
//=============================================================================
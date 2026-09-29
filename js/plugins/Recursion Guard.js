//=============================================================================
// Andrew_PassiveStateRecursionGuard.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_PassiveStateRecursionGuard = true;

/*:
 * @plugindesc v1.00 Prevents a RangeError: Maximum call stack size exceeded
 * caused by mutual recursion between passiveStatesRaw() and isAlive() in the
 * YEP_AutoPassiveStates/YEP_X_PassiveAuras stack. Requires both.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * The bug
 * ============================================================================
 *
 * Game_Actor.prototype.passiveStatesRaw (YEP_AutoPassiveStates.js) caches its
 * result in this._passiveStatesRaw, and only checks that cache at the very
 * top of the function. Every refresh() call resets it to undefined, and it
 * stays undefined for the whole time the function is (re)computing it.
 *
 * YEP_X_PassiveAuras.js's aura-gathering step (auraStateIds/validAuraStateIds)
 * already guards itself against reentrancy, but only with a single global
 * flag ($gameTemp._isGatheringAuraData) that covers just that step. The
 * second half of passiveStatesRaw() -- checking each equip/skill/class's
 * <Passive Condition> and <Custom Passive Condition> notetags -- runs AFTER
 * that flag has already been reset to false. If any of those conditions
 * calls isAlive() (directly, or indirectly through a custom eval script) on
 * a battler whose own passiveStatesRaw() is ALSO still mid-computation right
 * now, nothing stops it: that battler recomputes fully, which can call back
 * into the first battler's isAlive(), whose cache is also still undefined --
 * genuine mutual recursion, not caught by any existing guard, until the call
 * stack overflows.
 *
 * Andrew_ZeroHpState.js's own comments already flagged half of this (why it
 * only ever applies the KO state to actors, never fresh enemies) -- the
 * actor side was "safe" only because nothing used to call isAlive() on an
 * actor in the narrow window right after refresh() invalidated its cache but
 * before it was rebuilt. Andrew_Skill380ItemSelect.js's isAlive() check on
 * its captured target, run right after skill 380's own resolution already
 * invalidated that target's cache, is exactly that window.
 *
 * ============================================================================
 * The fix
 * ============================================================================
 *
 * Wrap Game_Actor.prototype.passiveStatesRaw and Game_Enemy.prototype
 * .passiveStatesRaw (as installed by YEP_AutoPassiveStates.js) with a
 * per-battler "already computing" flag -- the same cycle-breaking technique
 * YEP_AutoPassiveStates.js and YEP_X_PassiveAuras.js already use for a
 * single state checking its own condition (_checkPassiveStateCondition /
 * _checkAuraStateCondition), just scoped to the whole computation instead of
 * one state ID.
 *
 * If passiveStatesRaw() is asked to recompute for a battler while that exact
 * battler's own computation is already in progress higher up the call
 * stack, it returns the best safe answer immediately instead of recursing
 * further: the last successfully cached value if there is one, otherwise an
 * empty list (this battler simply has no known passive states from this
 * particular reentrant angle -- the outer, real computation that's already
 * in progress will finish normally and cache the correct, complete value
 * once it unwinds).
 *
 * This is a strict superset of the existing global aura-gathering flag: it
 * also catches recursion introduced by custom passive/aura condition eval
 * code, and it's scoped per battler instead of globally, so one battler's
 * in-progress computation never blocks an unrelated battler's fresh one.
 *
 * ============================================================================
 * Installation
 * ============================================================================
 *
 * Load BELOW both YEP_AutoPassiveStates.js and YEP_X_PassiveAuras.js (it
 * wraps whatever passiveStatesRaw ends up being after both have installed
 * their own overrides). Position relative to other Andrew_ plugins doesn't
 * matter.
 *
 * ============================================================================
 */

(function() {

  function guardPassiveStatesRaw(Klass) {
    if (!Klass || !Klass.prototype || typeof Klass.prototype.passiveStatesRaw !== 'function') return;

    var _passiveStatesRaw = Klass.prototype.passiveStatesRaw;
    Klass.prototype.passiveStatesRaw = function() {
      if (this._computingPassiveStatesRaw) {
        return this._passiveStatesRaw !== undefined ? this._passiveStatesRaw : [];
      }
      this._computingPassiveStatesRaw = true;
      try {
        return _passiveStatesRaw.call(this);
      } finally {
        this._computingPassiveStatesRaw = false;
      }
    };
  }

  guardPassiveStatesRaw(Game_Actor);
  guardPassiveStatesRaw(Game_Enemy);

})();

//=============================================================================
// End of File
//=============================================================================
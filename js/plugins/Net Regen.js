//=============================================================================
// Andrew_NetDoTHoTPopup.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_NetDoTHoTPopup = true;

var Andrew = Andrew || {};
Andrew.NetDoTHoTPopup = Andrew.NetDoTHoTPopup || {};
Andrew.NetDoTHoTPopup.version = 1.04;

if (Imported.YEP_X_ExtDoT) {

//=============================================================================
/*:
 * @plugindesc v1.03 (Req YEP_X_ExtDoT) Merges same-tick DoT/HoT popups into
 * a single net HP change popup.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * YEP_X_ExtDoT.js processes every DoT/HoT state on a battler within a
 * single regen tick (Game_Battler.prototype.processDamageOverTimeStates),
 * calling gainHp() and startDamagePopup() separately for each state that
 * ticks. This plugin does not touch any of that math -- every state's
 * formula, variance, and element calculation still runs and applies HP
 * exactly as YEP_X_ExtDoT wrote it. It only changes what gets displayed:
 * instead of one popup per state, all DoT/HoT popups within the same
 * tick are suppressed and replaced with a single popup showing the net
 * HP change across every state that ticked that turn.
 *
 * Example: a battler with a 100 HP HoT and a 40 HP DoT ticking the same
 * turn still gains 60 HP total, same as before -- it now shows one
 * green "+60" popup instead of two separate, easy-to-misread popups.
 *
 * If every DoT/HoT on a battler cancels out to a net of exactly 0 for
 * that tick, no popup is shown (there's nothing to report). To always
 * show a "+0" popup instead, remove the `if (net === 0) return;` line
 * in Game_Battler.prototype.andrewFinishDotHotBatch below.
 *
 * This plugin only intercepts popups spawned by
 * processDamageOverTimeStates(). Damage/healing popups from skills,
 * items, counters, reflects, or anything else are completely untouched
 * -- they never set the batching flag this plugin checks for, so they
 * fall straight through to the original startDamagePopup().
 *
 * Compatibility with per-tick counters (e.g. a plugin that adds a stack
 * of "residue" every time a poison state ticks): startDamagePopup() is
 * always called through in full, once per state per tick, exactly as
 * before -- this plugin never skips that call, it only decides
 * afterward whether the resulting popup sprite should be visible. So
 * anything that counts DoT/HoT ticks by hooking gainHp,
 * processDamageOverTimeStateEffect, pushPassiveLogEntry, or even
 * startDamagePopup itself will keep firing exactly as it always has.
 * Only the floating number on screen is consolidated.
 *
 * ============================================================================
 * Installation
 * ============================================================================
 *
 * Place this below YEP_X_ExtDoT.js AND below any other plugin that adds
 * its own HP gain/loss during the regen phase by aliasing
 * Game_Battler.prototype.regenerateAll (for example Poison_Heal.js or
 * Toxic_Heal.js). This plugin needs to be the outermost alias on
 * regenerateAll so its batching window wraps every regen-phase HP change,
 * not just the ones coming from YEP_X_ExtDoT's DoT/HoT ticks.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.04:
 * - Fixed: DoT/HoT ticks and extra regen-phase heals (Poison_Heal.js,
 *   Toxic_Heal.js, etc.) were showing as separate, unmerged popups
 *   instead of being folded into the single net popup. The batching
 *   window previously only wrapped
 *   Game_Battler.prototype.processDamageOverTimeStates, which is called
 *   from *inside* YEP_X_ExtDoT's regenerateAll override, before that
 *   override hands off to the original regenerateAll it aliased. Any
 *   plugin that itself aliases regenerateAll to add its own gainHp() +
 *   startDamagePopup() call (as Poison_Heal.js and Toxic_Heal.js do)
 *   therefore ran its heal *after* the batching window had already
 *   closed, so that heal's popup was never suppressed or merged in --
 *   it always appeared as its own separate popup. This is easy to miss
 *   testing enemies if enemies never carry the specific state
 *   combination those heal plugins check for, since the bug only shows
 *   up on whichever battlers actually receive both required states at
 *   once. The batching window now wraps the entire regenerateAll call
 *   instead of just processDamageOverTimeStates, so it covers every
 *   gainHp()/startDamagePopup() call made during that battler's regen
 *   phase, regardless of which plugin issued it -- as long as this
 *   plugin is loaded below the plugin(s) issuing those calls (see
 *   Installation above).
 *
 * Version 1.03:
 * - Fixed: TypeError, "this._damagePopup.push is not a function", thrown
 *   from YEP_BattleEngineCore's startDamagePopup override. That plugin
 *   replaces the vanilla boolean _damagePopup flag with a queue array
 *   (so multiple simultaneous popups can stack), but this plugin was
 *   unconditionally setting _damagePopup = false to cancel a popup,
 *   turning the queue array into a boolean and crashing the very next
 *   push onto it. Popup suppression now trims the queue array back to
 *   its pre-call length when one is present, and only falls back to the
 *   boolean flag when it isn't -- so it works correctly whether or not
 *   YEP_BattleEngineCore's popup queue override is in play.
 *
 * Version 1.02:
 * - Fixed: no popup at all was showing for DoT/HoT ticks. The net value
 *   was being read back out of _result.hpDamage inside startDamagePopup,
 *   but something in between gainHp() and startDamagePopup() (most
 *   likely the combat log's pushPassiveLogEntry, or anything else that
 *   touches _result in that window) could clear or overwrite it first,
 *   so the captured amount silently came back as 0 and the batch ended
 *   with nothing to show. The net value is now captured directly off
 *   the gainHp() parameter instead, which nothing downstream can alter
 *   before this plugin sees it.
 *
 * Version 1.01:
 * - Changed the popup suppression method: startDamagePopup() is now
 *   always called through the full alias chain during a DoT/HoT batch,
 *   with the individual popup's visual canceled afterward instead of
 *   the call being skipped outright. This preserves compatibility with
 *   any other plugin that hooks startDamagePopup for its own per-tick
 *   bookkeeping (e.g. stack/residue counters).
 *
 * Version 1.00:
 * - Finished plugin.
 */
//=============================================================================

//=============================================================================
// Game_Battler
//=============================================================================

// Hooked on regenerateAll rather than processDamageOverTimeStates so the
// batching window covers the *entire* regen phase for this battler --
// not just the DoT/HoT ticks YEP_X_ExtDoT drives through
// processDamageOverTimeStates, but also any extra gainHp()/
// startDamagePopup() calls other plugins add by aliasing regenerateAll
// (e.g. Poison_Heal.js, Toxic_Heal.js). Those plugins call through to
// the original regenerateAll first and then apply their own heal
// afterward, so if this plugin only wrapped processDamageOverTimeStates,
// their heal would land after the batching window had already closed
// and would show as its own separate, unmerged popup. Wrapping the
// whole regenerateAll call instead means it doesn't matter how many
// other plugins chain onto regenerateAll below this one in the alias
// chain -- every gainHp() call made anywhere during this call gets
// accumulated into the same net total, as long as this plugin is loaded
// below them (see Installation above).
Andrew.NetDoTHoTPopup.Game_Battler_regenerateAll =
    Game_Battler.prototype.regenerateAll;
Game_Battler.prototype.regenerateAll = function() {
  // Match YEP_X_ExtDoT's own guard -- only batch actual battle regen
  // ticks, so field-step/menu HP regen (which doesn't show popups
  // anyway) isn't routed through this at all.
  if (!this.isAlive() || !$gameParty.inBattle()) {
    Andrew.NetDoTHoTPopup.Game_Battler_regenerateAll.call(this);
    return;
  }
  this._andrewDotHotBatching = true;
  this._andrewDotHotNet = 0;
  Andrew.NetDoTHoTPopup.Game_Battler_regenerateAll.call(this);
  this._andrewDotHotBatching = false;
  this.andrewFinishDotHotBatch();
};

// Fires once, after this battler's entire regen phase has finished --
// every DoT/HoT tick plus any other plugin's regen-phase heal/damage
// that ran inside the same regenerateAll call. Builds a fresh, clean
// _result carrying only the net HP change, then hands off to the real
// startDamagePopup() so it renders exactly like any other single HP
// popup would.
Game_Battler.prototype.andrewFinishDotHotBatch = function() {
  var net = this._andrewDotHotNet || 0;
  this._andrewDotHotNet = 0;
  if (net === 0) return;
  this.clearResult();
  this._result.hpDamage = -net;
  this._result.hpAffected = true;
  this.startDamagePopup();
};

// Capture each tick's HP change straight off the gainHp() parameter --
// not by reading it back out of _result later. Something between gainHp()
// and startDamagePopup() (most likely the combat log's
// pushPassiveLogEntry, or anything else that calls clearResult()/refresh()
// in between) can touch _result before this plugin gets a chance to read
// it, silently zeroing out the captured amount. The value handed to
// gainHp() is the one thing guaranteed to still be exactly what
// YEP_X_ExtDoT computed, so that's what gets accumulated.
Andrew.NetDoTHoTPopup.Game_Battler_gainHp = Game_Battler.prototype.gainHp;
Game_Battler.prototype.gainHp = function(value) {
  if (this._andrewDotHotBatching) {
    this._andrewDotHotNet = (this._andrewDotHotNet || 0) + value;
  }
  Andrew.NetDoTHoTPopup.Game_Battler_gainHp.call(this, value);
};

Andrew.NetDoTHoTPopup.Game_Battler_startDamagePopup =
    Game_Battler.prototype.startDamagePopup;
Game_Battler.prototype.startDamagePopup = function() {
  var batching = this._andrewDotHotBatching;
  // YEP_BattleEngineCore replaces the vanilla boolean _damagePopup flag
  // with a queue array (it calls _damagePopup.push(...) so multiple
  // simultaneous popups can stack on one battler). Note the queue's
  // length -- if it's not an array at all, this project isn't using
  // that override and beforeLength is unused.
  var beforeLength = Array.isArray(this._damagePopup)
      ? this._damagePopup.length : 0;
  // Always call through the full alias chain, even while batching, so
  // any other plugin that hooks startDamagePopup for its own bookkeeping
  // (a stack counter keyed off "a DoT/HoT tick just happened," a
  // per-tick sound effect, whatever) still fires exactly once per state
  // per tick, same as it always has. This plugin never removes a call to
  // startDamagePopup -- it only decides afterward whether the resulting
  // popup should actually be visible.
  Andrew.NetDoTHoTPopup.Game_Battler_startDamagePopup.call(this);
  if (batching) {
    // Cancel just the individual popup's visual. Everything above runs
    // synchronously within the same regen tick, well before anything
    // reads or drains this queue for rendering, so trimming it back here
    // reliably removes only what this call just added -- it never
    // touches the boolean/array *type* itself, so it can't corrupt
    // whichever representation this project is actually using.
    if (Array.isArray(this._damagePopup)) {
      this._damagePopup.length = beforeLength;
    } else {
      this._damagePopup = false;
    }
  }
};

//=============================================================================
// End of File
//=============================================================================
} else {

  console.warn('Andrew_NetDoTHoTPopup requires YEP_X_ExtDoT to be present ' +
      'and placed above it in the plugin list.');

}
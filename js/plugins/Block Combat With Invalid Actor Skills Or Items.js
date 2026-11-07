//=============================================================================
// Andrew_RequireFullPartyInput.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_RequireFullPartyInput = true;

var Andrew = Andrew || {};
Andrew.RequireFullPartyInput = Andrew.RequireFullPartyInput || {};
Andrew.RequireFullPartyInput.version = 1.62;

//=============================================================================
/*:
 * @plugindesc v1.62 Combat won't begin until every party member has
 * selected a skill/item.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Overrides BattleManager.startTurn -- the single point where the engine
 * actually transitions from input to combat -- so it refuses to run
 * unless every actor able to act currently has a valid action assigned.
 * Navigation between actors (however that's already wired up in your
 * project, including right-key skip) is left completely untouched; this
 * plugin only ever steps in at that final checkpoint.
 *
 * If startTurn is reached while someone still needs an action, control is
 * handed back to that actor's command window instead of letting combat
 * begin.
 *
 * <Instant Cast> skills are exempt from counting as a "real" selection
 * for readiness purposes -- see Version 1.50 below.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.62:
 * - Found the actual cause of the "sometimes doesn't progress to combat"
 *   symptom (not an instant-cast readiness miss -- the 1.60/1.61 tracing
 *   confirmed the readiness check itself was correct). YEP_BattleEngineCore
 *   wraps Scene_Battle.prototype.selectNextCommand to call the underlying
 *   (vanilla) selectNextCommand -- which runs BattleManager.selectNextCommand()
 *   and this.changeInputWindow(), the call that actually hides the actor
 *   command window once input ends -- and then, on top of that, always runs
 *   this._helpWindow.clear() and BattleManager.stopAllSelection() itself.
 *   The early-start branch here called BattleManager.startTurn() directly
 *   and returned, skipping that entire wrapped chain. That's not just an
 *   out-of-order-selection edge case: it fires on the last actor's
 *   confirmation in every ordinary in-order turn too, since the readiness
 *   check runs before anything else. So on a normal turn the backend really
 *   did start the turn, but the actor command window was never told to
 *   close and the select-all targeting flag was never reset -- reading
 *   exactly like a stall. Fixed by explicitly calling
 *   this.changeInputWindow(), this._helpWindow.clear(), and
 *   BattleManager.stopAllSelection() in the early-start branch instead of
 *   skipping them.
 *
 * Version 1.61:
 * - Debug logging (Andrew.RequireFullPartyInput.debug = true) previously
 *   only fired inside andrewFindActorNeedingAction, so it could only show
 *   *why* an actor was still counted as needing an action -- it never
 *   showed which of the two call sites (the early-start branch in
 *   Scene_Battle.prototype.selectNextCommand, or BattleManager.startTurn
 *   itself) was actually running, or what each one decided once the
 *   party was found ready. That made it impossible to tell, when combat
 *   fails to progress, whether the readiness check itself is still
 *   blocking (an actor is being missed) or whether the check is passing
 *   and something downstream of the forced startTurn() call just isn't
 *   updating the scene. Added Andrew.RequireFullPartyInput.logMsg() and
 *   traced both call sites: selectNextCommand now logs whether it took
 *   the early-start path or fell through to the original chain, and
 *   startTurn now logs whether it bounced control back to an actor or
 *   proceeded into the original startTurn.
 *
 * Version 1.60:
 * - "Is this action an Instant Cast?" no longer relies on a note-tag regex
 *   (/<Instant Cast>/). It now asks YEP_InstantCast itself
 *   (actor.isInstantCast(item)) -- the exact same test YEP uses to decide
 *   whether to fire the skill on selection. The old regex disagreed with
 *   YEP whenever an action was instant (or NOT instant) for any reason other
 *   than a literal <Instant Cast> tag on the skill: the <Instant> alias,
 *   <Instant Skill: x> on an actor/class/weapon/armor/state,
 *   <Instant Eval>, and <Cancel Instant Skill: x>. When the two disagreed
 *   in the "tagged but cancelled" direction, an actor was permanently
 *   counted as "still needs an action", and startTurn kept handing control
 *   back to them even though they had a valid, non-instant action.
 * - The isInstantCast query temporarily clears
 *   BattleManager._startedInstantCasting: while YEP's endAction is still
 *   unwinding, that flag makes actor.isInstantCast() return
 *   BattleManager._instantCasting (undefined) for every item.
 * - Added Andrew.RequireFullPartyInput.debug (set true from the console,
 *   F8) to log which actor is counted as needing an action and why.
 *
 * Version 1.50:
 * - Fixed: if the last actor to select an action chose a skill tagged
 *   <Instant Cast>, the party-ready check (used both by the early-start
 *   in selectNextCommand and by startTurn itself) counted that as a
 *   completed selection and let combat begin immediately -- before the
 *   instant cast's own "fire immediately on selection" handling got a
 *   chance to run. An actor whose current action(0) is an Instant Cast
 *   skill is now still treated as needing action, so combat can't start
 *   out from under it. Once the instant skill fires and the actor is
 *   prompted for their real action, that new selection is checked
 *   normally.
 *
 * Version 1.40:
 * - MV's sequential selectNextCommand only tracks "how many times has
 *   this actor been asked for input," not whether a real action was
 *   assigned -- with out-of-order actor selection it can end up never
 *   reaching the point where it would call startTurn() on its own, so
 *   combat just never starts. Added a check that force-starts the turn
 *   the moment everyone's genuinely ready, while leaving the original
 *   chain (and therefore navigation) completely untouched otherwise.
 *
 * Version 1.30:
 * - Reverted to gating only BattleManager.startTurn. Previously this
 *   plugin also intercepted Scene_Battle.prototype.selectNextCommand,
 *   but that function is shared with right-key actor navigation, so it
 *   was blocking normal movement between actors who hadn't selected yet.
 *   Navigation is no longer touched at all.
 *
 * Version 1.20 - 1.21:
 * - Routed around BattleManager's sequential selectNextCommand, which
 *   didn't handle out-of-order actor selection correctly.
 *
 * Version 1.10:
 * - Kept the cursor on the actor who just acted on an incomplete party.
 *
 * Version 1.00:
 * - Finished plugin.
 */
//=============================================================================

//=============================================================================
// BattleManager
//=============================================================================

Andrew.RequireFullPartyInput.debug = false;

Andrew.RequireFullPartyInput.log = function(actor, reason) {
  if (!Andrew.RequireFullPartyInput.debug) return;
  console.log('[Andrew_RequireFullPartyInput] needs action: ' +
    (actor && actor.name ? actor.name() : actor) + ' (' + reason + ')');
};

// General-purpose trace logger for call-site/flow tracking (as opposed to
// the per-actor "why" logging above).
Andrew.RequireFullPartyInput.logMsg = function(msg) {
  if (!Andrew.RequireFullPartyInput.debug) return;
  console.log('[Andrew_RequireFullPartyInput] ' + msg);
};

// Ask YEP_InstantCast whether this action would be instant-cast for this
// actor, so this plugin always agrees with the engine (handles <Instant>,
// <Instant Cast>, <Instant Skill: x>, <Instant Eval>, <Cancel Instant ...>).
Andrew.RequireFullPartyInput.isInstantForActor = function(actor, item) {
  if (!actor || !item) return false;
  if (typeof actor.isInstantCast !== 'function') {
    // YEP_InstantCast not loaded: fall back to the literal note tags
    return !!(item.note && /<(?:INSTANT|INSTANT CAST)>/i.test(item.note));
  }
  // actor.isInstantCast() short-circuits to BattleManager._instantCasting
  // while _startedInstantCasting is true (which is still the case while
  // YEP's endAction wrapper unwinds), so clear it for the query.
  var saved = BattleManager._startedInstantCasting;
  BattleManager._startedInstantCasting = false;
  var result = false;
  try {
    result = !!actor.isInstantCast(item);
  } finally {
    BattleManager._startedInstantCasting = saved;
  }
  return result;
};

BattleManager.andrewFindActorNeedingAction = function() {
  return $gameParty.battleMembers().find(function(actor) {
    if (!actor.canInput()) return false;
    var action = actor.action(0);
    // Check that an item/skill has actually been assigned, rather than
    // calling action.isValid() -- isValid() walks into target-scope logic
    // (isForFriend/item().scope) that assumes an item is already set, and
    // throws on the exact "nothing selected yet" case we're checking for.
    if (!(action && action.item())) {
      Andrew.RequireFullPartyInput.log(actor, 'no action selected');
      return true;
    }
    // Instant Cast skills fire immediately upon selection via their own
    // handling elsewhere -- they don't represent a "real" action assigned
    // for the purposes of this readiness check. Counting them as ready
    // let combat start before the instant cast had fired.
    if (Andrew.RequireFullPartyInput.isInstantForActor(actor, action.item())) {
      Andrew.RequireFullPartyInput.log(actor,
        'action(0) is an unfired instant cast: ' + action.item().name);
      return true;
    }
    return false;
  });
};

Andrew.RequireFullPartyInput.BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
  var missingActor = this.andrewFindActorNeedingAction();
  if (missingActor) {
    var idx = $gameParty.battleMembers().indexOf(missingActor);
    Andrew.RequireFullPartyInput.logMsg('startTurn: bouncing control back to ' +
      (missingActor.name ? missingActor.name() : missingActor) +
      ' (battleMembers index ' + idx + ') instead of starting the turn');
    this.changeActor(idx, 'undecided');
    if (SceneManager._scene && SceneManager._scene.startActorCommandSelection) {
      SceneManager._scene.startActorCommandSelection();
    }
    return;
  }
  Andrew.RequireFullPartyInput.logMsg('startTurn: party ready -- ' +
    'proceeding into the original startTurn');
  Andrew.RequireFullPartyInput.BattleManager_startTurn.call(this);
};

//=============================================================================
// Scene_Battle
//=============================================================================

Andrew.RequireFullPartyInput.Scene_Battle_selectNextCommand =
    Scene_Battle.prototype.selectNextCommand;
Scene_Battle.prototype.selectNextCommand = function() {
  if (!BattleManager.andrewFindActorNeedingAction()) {
    // Everyone's genuinely ready -- start the turn directly rather than
    // trusting the engine's sequential advancement to get there on its
    // own, since out-of-order selection can leave it never reaching that
    // point by itself. BattleManager.startTurn() is the only part of the
    // original chain we actually need to force early; changeInputWindow()
    // (vanilla -- hides the actor command window once input ends),
    // helpWindow.clear(), and BattleManager.stopAllSelection() (both from
    // YEP_BattleEngineCore's own selectNextCommand wrapper) still have to
    // run every time, so they're called explicitly here instead of being
    // skipped along with the rest of the chain.
    Andrew.RequireFullPartyInput.logMsg('selectNextCommand: party ready -- ' +
      'taking early-start path (forcing BattleManager.startTurn() directly, ' +
      'then replaying the window teardown the skipped chain would have done)');
    BattleManager.startTurn();
    this.changeInputWindow();
    this._helpWindow.clear();
    BattleManager.stopAllSelection();
    return;
  }
  // Not everyone's ready -- leave this alone entirely so navigation
  // (including right-key skip) behaves exactly as it already does.
  Andrew.RequireFullPartyInput.logMsg('selectNextCommand: party not ready -- ' +
    'falling through to the original selectNextCommand chain');
  Andrew.RequireFullPartyInput.Scene_Battle_selectNextCommand.call(this);
};

//=============================================================================
// End of File
//=============================================================================
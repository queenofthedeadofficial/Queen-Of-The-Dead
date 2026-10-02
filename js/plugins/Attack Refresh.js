/*:
 * @plugindesc Robust patch for swapPartyMembers: apply swap, then reposition battle input cursor to first slot 0..3 needing input. Defensive and delayed to allow other plugins to finish.
 * @author Patch
 * @help
 * No plugin commands. Enable after your swap plugin.
 */

(function() {
  "use strict";

  // Keep original if present
  const originalSwap = (typeof window.swapPartyMembers === 'function') ? window.swapPartyMembers : null;

  // Helper: get actorId from various representations
  function actorIdFromEntry(entry) {
    if (entry == null) return null;
    if (typeof entry === 'number') return entry;
    if (typeof entry === 'object') {
      if (typeof entry.actorId === 'function') return entry.actorId();
      if (entry.actorId != null) return entry.actorId;
      if (entry._actorId != null) return entry._actorId;
    }
    return null;
  }

  // Helper: get Game_Actor instance by id, preferring battleMembers
  function findGameActorById(id) {
    if (id == null) return null;
    // Prefer current battle members (keeps same object identity)
    const bm = $gameParty.battleMembers();
    for (let i = 0; i < bm.length; i++) {
      const a = bm[i];
      const aid = (typeof a.actorId === 'function') ? a.actorId() : (a._actorId || a.actorId);
      if (aid === id) return a;
    }
    // Fallback to $gameActors
    return $gameActors.actor(id) || null;
  }

  // Core reposition logic (runs after swap completes)
  function repositionCursorToFirstSlot0to3() {
    try {
      const scene = SceneManager._scene;
      if (!scene || !(scene instanceof Scene_Battle)) return;
      if (!BattleManager.isInputting()) return;

      // Build normalized actors array (IDs) from BattleManager._actors
      const raw = Array.isArray(BattleManager._actors) ? BattleManager._actors : [];
      const actorsIds = raw.map(actorIdFromEntry).filter(id => id != null);

      if (actorsIds.length === 0) return;

      const members = $gameParty.members();

      // Find first slot 0..3 whose actorId is present in actorsIds
      let chosenId = null;
      let chosenPartyIndex = -1;
      for (let slot = 0; slot <= 3; slot++) {
        const actor = members[slot];
        if (!actor) continue;
        const id = (typeof actor.actorId === 'function') ? actor.actorId() : (actor._actorId || actor.actorId);
        if (id == null) continue;
        if (actorsIds.indexOf(id) !== -1) {
          chosenId = id;
          chosenPartyIndex = slot;
          break;
        }
      }

      if (chosenId == null) {
        // nothing to do
        return;
      }

      // Find index inside BattleManager._actors (use normalized ids)
      const newIndex = actorsIds.indexOf(chosenId);
      if (newIndex === -1) return;

      // Apply index and subject
      BattleManager._actorIndex = newIndex;
      const subjectActor = findGameActorById(chosenId);
      if (subjectActor) {
        BattleManager._subject = subjectActor;
      }

      // Update scene windows safely
      try {
        // Status window: select party slot
        if (scene._statusWindow && typeof scene._statusWindow.select === 'function' && chosenPartyIndex >= 0) {
          scene._statusWindow.select(chosenPartyIndex);
        }

        // Actor command window: setup for the subject and activate
        if (scene._actorCommandWindow) {
          try {
            if (subjectActor && typeof scene._actorCommandWindow.setup === 'function') {
              scene._actorCommandWindow.setup(subjectActor);
            }
            if (typeof scene._actorCommandWindow.select === 'function') scene._actorCommandWindow.select(0);
            if (typeof scene._actorCommandWindow.activate === 'function') scene._actorCommandWindow.activate();
          } catch (e) { /* ignore per-window errors */ }
        }

        // Enemy window: refresh if present (targeting)
        if (scene._enemyWindow && typeof scene._enemyWindow.refresh === 'function') {
          try { scene._enemyWindow.refresh(); } catch (e) { /* ignore */ }
        }

        // Refresh any other windows in the window layer that expose refresh()
        if (scene._windowLayer && scene._windowLayer.children) {
          for (let i = 0; i < scene._windowLayer.children.length; i++) {
            const child = scene._windowLayer.children[i];
            if (child && typeof child.refresh === 'function') {
              try { child.refresh(); } catch (e) { /* ignore */ }
            }
          }
        }

        // Light spriteset refresh if available
        if (scene._spriteset && typeof scene._spriteset.refresh === 'function') {
          try { scene._spriteset.refresh(); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // swallow UI update errors
      }
    } catch (e) {
      console.error('repositionCursorToFirstSlot0to3 error', e);
    }
  }

  // Wrapper for swapPartyMembers: call original, then schedule reposition on next tick
  window.swapPartyMembers = function(user, target) {
    // Call original swap if present
    if (typeof originalSwap === 'function') {
      try {
        originalSwap(user, target);
      } catch (e) {
        console.error('original swapPartyMembers threw', e);
      }
    } else {
      // fallback basic swap (should rarely be used if original exists)
      try {
        if (!user || !target) return;
        const party = $gameParty._actors;
        const i = party.indexOf(user.actorId());
        const j = party.indexOf(target.actorId());
        if (i < 0 || j < 0 || i === j) return;
        const tmp = party[i];
        party[i] = party[j];
        party[j] = tmp;
        $gameParty.refresh();
        BattleManager._actionBattlers = [];
        BattleManager._targets = [];
        if (SceneManager._scene && SceneManager._scene._statusWindow) {
          try { SceneManager._scene._statusWindow.refresh(); } catch (e) { /* ignore */ }
        }
        if (BattleManager._spriteset && typeof BattleManager._spriteset.refreshBattlers === 'function') {
          try { BattleManager._spriteset.refreshBattlers(); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.error('fallback swapPartyMembers error', e);
      }
    }

    // Defer reposition to next tick so other plugins' rebuilds finish
    try {
      setTimeout(function() {
        repositionCursorToFirstSlot0to3();
      }, 0);
    } catch (e) {
      // fallback immediate attempt
      try { repositionCursorToFirstSlot0to3(); } catch (err) { /* ignore */ }
    }
  };

  // Also expose a helper other plugins can call explicitly after they finish swapping
  window.refreshBattleAttackUI = function() {
    try {
      setTimeout(function() {
        repositionCursorToFirstSlot0to3();
      }, 0);
    } catch (e) {
      try { repositionCursorToFirstSlot0to3(); } catch (err) { /* ignore */ }
    }
  };

  // Clear any pending state if scene changes (defensive)
  const _SceneManager_updateScene = SceneManager.updateScene;
  SceneManager.updateScene = function() {
    _SceneManager_updateScene.call(this);
    // nothing to clear here in this implementation, but keep hook for future safety
  };

})();

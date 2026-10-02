/*:
 * @plugindesc Refresh selected battle windows and spriteset every N frames (default 6). Use cautiously.
 * @author Minimal
 * @help
 * Configurable: change INTERVAL_FRAMES and WINDOW_NAMES below.
 */

(function() {
  // === Configuration ===
  const INTERVAL_FRAMES = 6; // run refresh every 6 frames
  // Names of Scene_Battle properties to call refresh() on if present
  const WINDOW_NAMES = [
    "_statusWindow",
    "_partyCommandWindow",
    "_actorCommandWindow",
    "_skillWindow",
    "_itemWindow",
    "_enemyWindow",
    "_messageWindow",
    "_logWindow"
  ];
  const REFRESH_SPRITESET = true; // also call refresh() on this._spriteset if available

  // === Implementation ===
  const _Scene_Battle_update = Scene_Battle.prototype.update;
  Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);

    if (!this.___refreshFrameCounter && this.___refreshFrameCounter !== 0) {
      this.___refreshFrameCounter = 0;
    }
    this.___refreshFrameCounter++;

    if (this.___refreshFrameCounter >= INTERVAL_FRAMES) {
      this.___refreshFrameCounter = 0;

      try {
        // Refresh configured windows
        for (let i = 0; i < WINDOW_NAMES.length; i++) {
          const name = WINDOW_NAMES[i];
          if (this[name] && typeof this[name].refresh === 'function') {
            try { this[name].refresh(); } catch (e) { /* ignore single-window errors */ }
          }
        }

        // Optionally refresh spriteset
        if (REFRESH_SPRITESET && this._spriteset && typeof this._spriteset.refresh === 'function') {
          try { this._spriteset.refresh(); } catch (e) { /* ignore spriteset errors */ }
        }
      } catch (e) {
        // Defensive: never break the battle loop
        console.error('BattleRefreshInterval error', e);
      }
    }
  };

})();

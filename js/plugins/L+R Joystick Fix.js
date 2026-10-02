/*:
 * @plugindesc Prevent joystick left/right from switching between enemy and actor rows in battle.
 * @help
 * Drop this file into js/plugins and enable it.
 */

(function() {
  var _Scene_Battle_update = Scene_Battle.prototype.update;
  Scene_Battle.prototype.update = function() {
    // Let original update run first (keeps all other behavior)
    _Scene_Battle_update.call(this);

    try {
      // Only run our custom routing during input processing phase
      if (!this.isActive()) return;

      // Identify the selectable windows we care about
      var enemyWindow = this._enemyWindow;
      var actorWindow = this._actorWindow || this._partyCommandWindow || this._statusWindow;

      // Helper: return the currently active selectable window (if any)
      function activeSelectable() {
        if (enemyWindow && enemyWindow.active) return enemyWindow;
        if (actorWindow && actorWindow.active) return actorWindow;
        return null;
      }

      var activeWin = activeSelectable();
      if (!activeWin) return;

      // If left/right is pressed, route it only to the active window and stop propagation
      // Use isTriggered/isRepeated so joystick holds still move cursor
      if (Input.isRepeated('right')) {
        // call cursorRight on the active window if available
        if (typeof activeWin.cursorRight === 'function') {
          activeWin.cursorRight();
        }
        // consume the input by clearing the raw input state for left/right
        // (prevents other windows from also reacting)
        Input._latestButton = null;
      } else if (Input.isRepeated('left')) {
        if (typeof activeWin.cursorLeft === 'function') {
          activeWin.cursorLeft();
        }
        Input._latestButton = null;
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.error('Battle joystick routing error', e);
    }
  };
})();

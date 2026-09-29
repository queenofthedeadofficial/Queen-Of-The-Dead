/*:
 * @plugindesc Suppress only the HP damage popup for Skill 158's action instance (keeps item popups).
 * @help
 * Marks the exact Game_Action instance for Skill 158 when performed and suppresses
 * the next HP popup that belongs to that action instance only.
 */
(function() {
  const SUPPRESS_SKILL_ID = 158;

  // Marker for the exact action instance whose HP popup should be suppressed
  BattleManager._suppressHpPopupAction = null;

  // Clear marker when clearing action (safety)
  const _BattleManager_clearAction = BattleManager.clearAction;
  BattleManager.clearAction = function() {
    _BattleManager_clearAction.call(this);
    this._suppressHpPopupAction = null;
  };

  // Intercept log pushes to mark the action instance when performAction is queued
  const _Window_BattleLog_push = Window_BattleLog.prototype.push;
  Window_BattleLog.prototype.push = function(methodName) {
    try {
      // Many engines call push('performAction', subject, action)
      if (methodName === 'performAction') {
        const subject = arguments[1];
        const action = arguments[2];
        if (action && typeof action.item === 'function') {
          const it = action.item && action.item();
          if (it && it.id === SUPPRESS_SKILL_ID) {
            // mark this exact action instance for suppression of its HP popup
            try { BattleManager._suppressHpPopupAction = action; } catch (e) {}
          }
        }
      }

      // When popupDamage is queued, check whether it belongs to the marked action instance
      if (methodName === 'popupDamage') {
        const target = arguments[1]; // often the target is passed
        try {
          // Only suppress if the currently executing action is the marked one
          if (BattleManager._suppressHpPopupAction && BattleManager._action === BattleManager._suppressHpPopupAction) {
            // If the target's result indicates HP change (nonzero or even zero if you want to suppress zero-case),
            // skip only the HP popup. We check hpDamage property on the result object.
            if (target && target.result && typeof target.result().hpDamage !== 'undefined') {
              // Skip the popup and clear the marker so only the skill's popup is suppressed
              BattleManager._suppressHpPopupAction = null;
              return; // do not queue this popupDamage
            }
            // If no result object, still skip once for safety
            BattleManager._suppressHpPopupAction = null;
            return;
          }
        } catch (e) {
          // on error, clear marker and fall through to default
          try { BattleManager._suppressHpPopupAction = null; } catch (ee) {}
        }
      }
    } catch (e) {
      // non-fatal: fall back to default behavior
      try { console.warn("SuppressSkill158HpPopup internal error:", e); } catch (ee) {}
    }
    return _Window_BattleLog_push.apply(this, arguments);
  };

  // Safety net: override popupDamage itself to check the exact action instance
  const _Window_BattleLog_popupDamage = Window_BattleLog.prototype.popupDamage;
  Window_BattleLog.prototype.popupDamage = function(target) {
    try {
      if (BattleManager._suppressHpPopupAction && BattleManager._action === BattleManager._suppressHpPopupAction) {
        // Clear marker and skip this popup
        BattleManager._suppressHpPopupAction = null;
        return;
      }
    } catch (e) { /* ignore and fall through */ }
    _Window_BattleLog_popupDamage.call(this, target);
  };

  // Final fallback: wrap Game_Battler.startDamagePopup to avoid direct popups for the marked action
  if (Game_Battler.prototype.startDamagePopup) {
    const _Game_Battler_startDamagePopup = Game_Battler.prototype.startDamagePopup;
    Game_Battler.prototype.startDamagePopup = function() {
      try {
        if (BattleManager._suppressHpPopupAction && BattleManager._action === BattleManager._suppressHpPopupAction) {
          BattleManager._suppressHpPopupAction = null;
          return; // skip popup for that action instance
        }
      } catch (e) { /* ignore */ }
      _Game_Battler_startDamagePopup.call(this);
    };
  }

})();

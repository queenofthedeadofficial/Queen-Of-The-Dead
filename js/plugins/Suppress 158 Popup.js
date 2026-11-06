/*:
 * @plugindesc Suppress damage popup for a specific skill (Skill ID 158).
 */
(function() {
  const SUPPRESS_SKILL_ID = 158;

  const _Window_BattleLog_popupDamage = Window_BattleLog.prototype.popupDamage;
  Window_BattleLog.prototype.popupDamage = function(target) {
    try {
      const action = BattleManager._action;
      const item = action && action.item && action.item();
      if (item && item.id === SUPPRESS_SKILL_ID) {
        // skip the popup for this skill
        return;
      }
    } catch (e) {
      // fall back to default on error
    }
    _Window_BattleLog_popupDamage.call(this, target);
  };
})();

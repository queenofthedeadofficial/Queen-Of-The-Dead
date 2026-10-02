/*:
 * @plugindesc Remove enemy level display in ADRI enemy status window.
 * @author Copilot
 */
(function() {
  'use strict';
  if (typeof Window_InBattleEnemyStatus !== 'undefined') {
    Window_InBattleEnemyStatus.prototype.drawEnemyFullName = function(enemy, showStats, x, y, width) {
      width = width || 336;
      // Always draw only the enemy name (no level)
      this.drawText(enemy.name(), x, y, width, 'right');
    };
  } else {
    console.warn('DisableEnemyLevel: Window_InBattleEnemyStatus not found.');
  }
})();

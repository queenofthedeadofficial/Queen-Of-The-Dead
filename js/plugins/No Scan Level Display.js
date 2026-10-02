/* Disable enemy level in ADRI enemy status window */
(function() {
  if (typeof Window_InBattleEnemyStatus !== 'undefined') {
    Window_InBattleEnemyStatus.prototype.drawEnemyFullName = function(enemy, showStats, x, y, width) {
      width = width || 336;
      this.drawText(enemy.name(), x, y, width, 'right');
    };
  } else {
    console.warn('DisableEnemyLevel: Window_InBattleEnemyStatus not found.');
  }
})();

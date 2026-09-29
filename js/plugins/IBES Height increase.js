/*:
 * @plugindesc Increases ADRi InBattleEnemyStatus enemy name box height by 20 pixels.
 * @author ChatGPT
 *
 * @help
 * Place below ADRI_InBattleEnemyStatus.js
 */

(function() {

    var _Window_EnemyBattleStatus_windowHeight =
        Window_EnemyBattleStatus.prototype.windowHeight;

    Window_EnemyBattleStatus.prototype.windowHeight = function() {
        return _Window_EnemyBattleStatus_windowHeight.call(this) + 20;
    };

})();
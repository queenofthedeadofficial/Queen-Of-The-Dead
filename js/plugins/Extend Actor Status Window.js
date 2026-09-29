/*:
 * @plugindesc Adds +20px height to the battle status window (YEP compatible)
 */

(function() {

  const _Window_BattleStatus_windowHeight =
    Window_BattleStatus.prototype.windowHeight;

  Window_BattleStatus.prototype.windowHeight = function() {
    return _Window_BattleStatus_windowHeight.call(this) + 20;
  };

})();
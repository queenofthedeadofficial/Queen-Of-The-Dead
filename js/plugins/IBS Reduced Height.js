/*:
 * @plugindesc Reduce the YEP In-Battle Status window height by 20 pixels.
 * @author ChatGPT
 *
 * @help
 * Place below YEP_X_InBattleStatus.
 */

(function() {

if (typeof Window_InBattleStatus === 'undefined') return;

Window_InBattleStatus.prototype.initialize = function() {
    var x = eval(Yanfly.Param.IBSWinX);
    var y = eval(Yanfly.Param.IBSWinY);
    var w = eval(Yanfly.Param.IBSWinWidth);
    var h = eval(Yanfly.Param.IBSWinHeight) - 20; // Reduce height

    this._battler = $gameParty.battleMembers()[0];
    Window_Base.prototype.initialize.call(this, x, y, w, h);
    this.hide();
};

})();
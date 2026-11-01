/*:
 * @plugindesc Makes ADRi InBattleEnemyStatus parameter names white.
 * @author ChatGPT
 *
 * @help
 * Place below ADRI_InBattleEnemyStatus.js
 */

(function() {

    var _Window_InBattleEnemyStatus_drawParam =
        Window_InBattleEnemyStatus.prototype.drawParam;

    Window_InBattleEnemyStatus.prototype.drawParam = function(paramId, showStats, dx, dy, dw, dh) {

        this.drawDarkRect(dx, dy, dw, dh);

        var level = this._battler._buffs[paramId];
        var icon = this._battler.buffIconIndex(level, paramId);

        this.drawIcon(icon, dx + 2, dy + 2);

        dx += Window_Base._iconWidth + 4;
        dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;

        // Parameter name color
        this.changeTextColor(this.normalColor());
        this.drawText(TextManager.param(paramId), dx, dy, dw);

        // Parameter value color
        var value = this._battler.param(paramId);
        this.changeTextColor(this.paramchangeTextColor(level));
        this.drawText(showStats ? Yanfly.Util.toGroup(value) : ADRI.Params.UnknownStat,
            dx, dy, dw, 'right');
    };

})();
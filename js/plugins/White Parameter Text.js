/*:
 * @plugindesc v1.0 - Makes parameter names white in YEP_X_InBattleStatus.
 * @author ChatGPT
 *
 * @help
 * Place BELOW YEP_X_InBattleStatus.
 */

(function() {

if (typeof Window_InBattleStatus === 'undefined') return;

Window_InBattleStatus.prototype.drawParam = function(paramId, dx, dy, dw, dh) {
    this.drawDarkRect(dx, dy, dw, dh);

    var level = this._battler._buffs[paramId];
    var icon = this._battler.buffIconIndex(level, paramId);
    this.drawIcon(icon, dx + 2, dy + 2);

    dx += Window_Base._iconWidth + 4;
    dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;

    // Draw parameter name in white.
    this.changeTextColor("#FFFFFF");
    this.drawText(TextManager.param(paramId), dx, dy, dw);

    // Draw parameter value in its normal buff/debuff color.
    var value = this._battler.param(paramId);
    this.changeTextColor(this.paramchangeTextColor(level));
    this.drawText(Yanfly.Util.toGroup(value), dx, dy, dw, "right");
};

})();
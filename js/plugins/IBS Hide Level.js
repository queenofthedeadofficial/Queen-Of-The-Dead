/*:
 * @plugindesc Hides the Level text and value in YEP_X_InBattleStatus.
 * @author ChatGPT
 *
 * @help
 * Place below YEP_X_InBattleStatus.
 */

(function() {

if (typeof Window_InBattleStatus === 'undefined') return;

Window_InBattleStatus.prototype.refresh = function() {
    this.contents.clear();
    if (!this._battler) return;

    var x = this.standardPadding() + eval(Yanfly.Param.IBSStatusListWidth);
    this.drawActorFace(this._battler, x, 0, Window_Base._faceWidth);

    var x2 = x + Window_Base._faceWidth + this.standardPadding();
    var w = this.contents.width - x2;

    // Draw actor name
    this.drawActorName(this._battler, x2, 0, w);

    // Draw class (same location drawActorSimpleStatus normally uses)
    this.drawActorClass(this._battler, x2, this.lineHeight(), w);

    // Draw HP/MP/TP gauges
    var gaugeY = this.lineHeight() * 2;
    this.drawActorHp(this._battler, x2, gaugeY, w);
    this.drawActorMp(this._battler, x2, gaugeY + this.lineHeight(), w);

    if ($dataSystem.optDisplayTp) {
        this.drawActorTp(this._battler, x2, gaugeY + this.lineHeight() * 2, w);
    }

    w = this.contents.width - x;
    var y = Math.ceil(this.lineHeight() * 4.5);
    var h = this.contents.height - y;

    if (h >= this.lineHeight() * 6) {
        for (var i = 2; i < 8; ++i) {
            this.drawParam(i, x, y, w, this.lineHeight());
            y += this.lineHeight();
        }
    } else {
        w = Math.floor(w / 2);
        x2 = x;
        for (var i = 2; i < 8; ++i) {
            this.drawParam(i, x2, y, w, this.lineHeight());
            if (i % 2 === 0) {
                x2 += w;
            } else {
                x2 = x;
                y += this.lineHeight();
            }
        }
    }
};

})();
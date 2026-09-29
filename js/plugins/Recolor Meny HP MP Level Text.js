/*:
 * @plugindesc Colors only the HP label, MP label, and Level label.
 * @author ChatGPT
 */

(function() {

    //-------------------------------------------------------------------------
    // HP
    //-------------------------------------------------------------------------

    Window_Base.prototype.drawActorHp = function(actor, x, y, width) {
        width = width || 186;
        var color1 = this.hpGaugeColor1();
        var color2 = this.hpGaugeColor2();
        this.drawGauge(x, y, width, actor.hpRate(), color1, color2);

        this.changeTextColor('#b0ff90'); // HP label
        this.drawText(TextManager.hpA, x, y, 44);

        this.drawCurrentAndMax(
            actor.hp,
            actor.mhp,
            x,
            y,
            width,
            this.hpColor(actor),
            this.normalColor()
        );
    };

    //-------------------------------------------------------------------------
    // MP
    //-------------------------------------------------------------------------

    Window_Base.prototype.drawActorMp = function(actor, x, y, width) {
        width = width || 186;
        var color1 = this.mpGaugeColor1();
        var color2 = this.mpGaugeColor2();
        this.drawGauge(x, y, width, actor.mpRate(), color1, color2);

        this.changeTextColor('#8cfffb'); // MP label
        this.drawText(TextManager.mpA, x, y, 44);

        this.drawCurrentAndMax(
            actor.mp,
            actor.mmp,
            x,
            y,
            width,
            this.mpColor(actor),
            this.normalColor()
        );
    };

    //-------------------------------------------------------------------------
    // Level
    //-------------------------------------------------------------------------

    Window_Base.prototype.drawActorLevel = function(actor, x, y) {
        this.changeTextColor('#ffffff'); // Level label
        this.drawText(TextManager.levelA, x, y, 48);

        this.resetTextColor(); // Level value
        this.drawText(actor.level, x + 84, y, 36, 'right');
    };

})();
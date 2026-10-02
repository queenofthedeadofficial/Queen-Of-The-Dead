/*:
 * @plugindesc Centers General tab stats and hides EXP/Level for Actors 1-3 in YEP_StatusMenuCore.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * For Actors 1-3 only:
 *
 * - Hides the entire EXP section
 * - Hides Level text and Level value
 * - Centers the remaining parameter/stat section
 *
 * Other actors remain unaffected.
 *
 * Place BELOW YEP_StatusMenuCore.
 * ============================================================================
 */

(function() {
    'use strict';

    //-----------------------------------------------------------------------------
    // Hide EXP section for Actors 1-3
    //-----------------------------------------------------------------------------

    var _Window_StatusInfo_drawGeneralExp =
        Window_StatusInfo.prototype.drawGeneralExp;

    Window_StatusInfo.prototype.drawGeneralExp = function(dx, dy, dw, dh) {
        if (this._actor && this._actor.actorId() >= 1 &&
            this._actor.actorId() <= 3) {
            return;
        }

        _Window_StatusInfo_drawGeneralExp.call(this, dx, dy, dw, dh);
    };

    //-----------------------------------------------------------------------------
    // Custom centered General layout
    //-----------------------------------------------------------------------------

    Window_StatusInfo.prototype.drawGeneral = function() {
        var actorId = this._actor.actorId();

        // Actors 1-3 use custom centered layout
        if (actorId >= 1 && actorId <= 3) {
            var dx = this.contents.width * 0.25;
            var dy = this.lineHeight() / 2;
            var dw = this.contents.width * 0.5;

            this.changeTextColor(this.systemColor());
            this.drawText(Yanfly.Param.StatusParamText, dx, dy, dw, 'center');

            this.drawGeneralParamCentered(dx, dy, dw);
            return;
        }

        // Default behavior
        var dx2 = this.standardPadding() / 2;
        var dy2 = this.lineHeight() / 2;
        var dw2 = (this.contents.width - this.standardPadding()) / 2;
        var dh2 = this.lineHeight();

        this.changeTextColor(this.systemColor());
        this.drawText(Yanfly.Param.StatusParamText, dx2, dy2, dw2, 'center');

        dx2 += this.contents.width / 2;

        this.drawText(Yanfly.Param.StatusExpText, dx2, dy2, dw2, 'center');

        this.drawGeneralParam(dx2, dy2, dw2, dh2);
        this.drawGeneralExp(dx2, dy2, dw2, dh2);
    };

    //-----------------------------------------------------------------------------
    // Draw centered parameters without Level
    //-----------------------------------------------------------------------------

    Window_StatusInfo.prototype.drawGeneralParamCentered = function(dx, dy, dw) {
        var rect = new Rectangle();

        rect.width = dw / 2;
        rect.height = this.lineHeight();
        rect.y = this.lineHeight() * 3;

        var textX;
        var textW = rect.width - this.textPadding() * 2;

        // Parameters only (ATK-LUK)
        for (var i = 2; i < 8; ++i) {

            if (i % 2 === 0) {
                rect.x = dx;
            } else {
                rect.x = dx + rect.width;
            }

            textX = rect.x + this.textPadding();

            this.drawDarkRect(rect.x, rect.y, rect.width, rect.height);

            this.changeTextColor(this.systemColor());
            this.drawText(
                TextManager.param(i),
                textX,
                rect.y,
                textW,
                'left'
            );

            this.changeTextColor(this.normalColor());
            this.drawText(
                Yanfly.Util.toGroup(this._actor.param(i)),
                textX,
                rect.y,
                textW,
                'right'
            );

            if (i % 2 !== 0) {
                rect.y += this.lineHeight();
            }
        }
    };

})();
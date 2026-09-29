/*:
 * @plugindesc Hide the level in the Status Menu for actors 1, 2, and 3. (YEP_StatusMenuCore compatible)
 * @author ChatGPT
 *
 * @help
 * Place below YEP_StatusMenuCore.
 *
 * Actors with database IDs 1, 2, and 3 will not have their level
 * displayed in the Status Menu. Other actors are unaffected.
 */

(function() {

    var _Window_StatusInfo_drawGeneral = Window_StatusInfo.prototype.drawGeneral;

    Window_StatusInfo.prototype.drawGeneral = function() {
        var actor = this._actor;

        if (!actor || [1, 2, 3].indexOf(actor.actorId()) === -1) {
            return _Window_StatusInfo_drawGeneral.call(this);
        }

        var dx = this._leftWindow ? this._leftWindow.contentsWidth() : 0;
        var dw = this.contents.width - dx;
        var lh = this.lineHeight();

        this.drawDarkRect(dx, 0, dw, lh * 2);

        this.changeTextColor(this.systemColor());
        this.drawText(TextManager.nickname, dx + this.textPadding(), 0, 120);
        this.resetTextColor();
        this.drawText(actor.nickname(), dx + 120, 0, dw - 120);

        // Level intentionally omitted

        this.changeTextColor(this.systemColor());
        this.drawText(TextManager.class, dx + this.textPadding(), lh, 120);
        this.resetTextColor();
        this.drawText(actor.currentClass().name, dx + 120, lh, dw - 120);
    };

})();
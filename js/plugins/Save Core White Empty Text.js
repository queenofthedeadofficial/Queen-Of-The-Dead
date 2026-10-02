/*:
 * @plugindesc Makes the "Empty" text in YEP Save Core white.
 * @author ChatGPT
 *
 * @help
 * Place this plugin below YEP_SaveCore.js.
 */

(function() {

    Window_SaveInfo.prototype.drawInvalidText = function(dy) {
        this.drawDarkRect(0, dy, this.contents.width, this.contents.height - dy);
        dy = (this.contents.height - dy - this.lineHeight()) / 2;

        var text;
        if (this._info) {
            text = Yanfly.Param.SaveInfoInvalid;
        } else {
            text = Yanfly.Param.SaveInfoEmpty;
        }

        this.changeTextColor('#ffffff');
        this.drawText(text, 0, dy, this.contents.width, 'center');
    };

})();
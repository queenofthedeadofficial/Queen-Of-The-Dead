/*:
 * @plugindesc Centers File 1, File 2, etc. across the entire YEP Save Core file window.
 * @author ChatGPT
 *
 * @help
 * Place this plugin below YEP_SaveCore.js.
 */

(function() {

    Window_SavefileList.prototype.drawFileId = function(id, x, y) {
        var text = this.fileIdText(id);

        this.drawText(text, 0, y, this.contents.width, 'center');
    };

})();
/*:
 * @plugindesc Center-aligns command window text. Compatible with YEP. v1.0
 * @author ChatGPT
 *
 * @help
 * Place this plugin BELOW all YEP plugins.
 *
 * This changes command window text from left-aligned to centered.
 */

(function() {

    Window_Command.prototype.drawItem = function(index) {
        var rect = this.itemRectForText(index);
        var align = 'center';
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    };

})();
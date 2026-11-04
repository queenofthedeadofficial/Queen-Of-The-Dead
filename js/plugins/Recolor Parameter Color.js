/*:
 * @plugindesc Minimal plugin to recolor status parameter text to #ffffff
 * @author You
 *
 * @help
 * This plugin recolors the parameter names and values shown in
 * Main Menu > Status > Actor > General to the hex color #ffffff.
 * No plugin parameters. Compatible with YEP plugins that do not
 * heavily override Window_StatusParams.
 */

(function() {
    'use strict';

    if (typeof Window_StatusParams === 'undefined') {
        return;
    }

    Window_StatusParams.prototype.drawItem = function(index) {
        var rect = this.itemRectForText(index);
        var x = rect.x;
        var y = rect.y;
        var paramId = index + 2; // params start at 2 (MHP, MMP, ATK, etc.)
        var name = TextManager.param(paramId);
        var value = this._actor.param(paramId);

        // Set text color to white
        this.changeTextColor('#ffffff');

        // Draw name and value (adjust widths if your layout differs)
        this.drawText(name, x, y, 160);
        this.drawText(String(value), x + 160, y, 48, 'right');

        // Restore default color for any following text
        this.resetTextColor();
    };

})();

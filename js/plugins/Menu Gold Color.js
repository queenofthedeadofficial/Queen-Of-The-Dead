/*:
 * @plugindesc Changes only the Gold currency label color to gold yellow.
 * @author ChatGPT
 *
 * @help
 * Place below YEP_CoreEngine.
 */

(function() {

    Window_Base.prototype.drawCurrencyValue = function(value, unit, x, y, width) {
        var unitWidth = Math.min(80, this.textWidth(unit));

        // Draw the number exactly like RPG Maker MV.
        this.resetTextColor();
        this.drawText(value, x, y, width - unitWidth - 6, 'right');

        // Draw the currency unit exactly like RPG Maker MV, but gold.
        this.changeTextColor("#FFD700");
        this.drawText(unit, x + width - unitWidth, y, unitWidth, 'right');
    };

})();
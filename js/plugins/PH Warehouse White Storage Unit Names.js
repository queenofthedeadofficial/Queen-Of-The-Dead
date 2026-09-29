/*:
 * @plugindesc Draws the storage unit's title in white instead of the default crisis (orange/yellow) color.
 * @author Andrew
 *
 * @help
 * Andrew_WhiteWarehouseTitle.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseTitle globally
 * (window.Window_WarehouseTitle = Window_WarehouseTitle;).
 *
 * PH_Warehouse's original refresh() draws the title using
 * this.crisisColor(). This overrides it to use this.normalColor()
 * (white) instead.
 * ----------------------------------------------------------------------
 */

(function() {

    Window_WarehouseTitle.prototype.refresh = function() {
        this.contents.clear();
        this.changeTextColor(this.normalColor());
        this.drawText(PHPlugins.PHWarehouse._lastActive, 0, 0, Graphics.boxWidth, "center");
    };

})();

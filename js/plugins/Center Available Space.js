/*:
 * @plugindesc Centers the "Available Space" text inside PH_Warehouse's info window.
 * @author Andrew
 *
 * @help
 * Andrew_CenterWarehouseAvailableSpace.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseInfo globally
 * (window.Window_WarehouseInfo = Window_WarehouseInfo;) since the class
 * is otherwise scoped inside PH_Warehouse's own closure.
 *
 * PH_Warehouse's original Window_WarehouseInfo.prototype.refresh draws
 * the "Available Space: X / Y" text left-aligned. This overrides that
 * method to center the text horizontally within the window's content
 * area instead.
 * ----------------------------------------------------------------------
 */

(function() {

    Window_WarehouseInfo.prototype.refresh = function() {
        this.contents.clear();
        this.availableSpaceValue = (PHPlugins.PHWarehouse._warehouses[PHPlugins.PHWarehouse._lastActive].maxCapacity - PHPlugins.PHWarehouse.getCurrentCapacity(PHPlugins.PHWarehouse._lastActive)) + " / " + PHPlugins.PHWarehouse._warehouses[PHPlugins.PHWarehouse._lastActive].maxCapacity;
        this.changeTextColor(this.normalColor());
        this.drawText(this.availableSpaceText + this.availableSpaceValue, 0, 0, this.contents.width, 'center');
    };

})();
/*:
 * @plugindesc Resizes the item list to sit flush below the (now 2-line) item description window, no overlap.
 * @author Andrew
 *
 * @help
 * Andrew_ResizeItemListForHelp.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list. Intended to be
 * used together with Andrew_WarehouseItemHelp.js, but has no runtime
 * dependency on it — this plugin computes the help window's position
 * and size using the same fixed fittingHeight() formula that plugin
 * uses (fittingHeight(3) for y, fittingHeight(2) for height), rather
 * than looking up the actual help window instance. If you ever change
 * the help window's line count or position in Andrew_WarehouseItemHelp.js,
 * update the matching numbers here too.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseItemList globally
 * (window.Window_WarehouseItemList = Window_WarehouseItemList;).
 *
 * Rather than building the item list at its original size and moving
 * it afterward (which previously caused a frame/skin rendering glitch),
 * this fully overrides Window_WarehouseItemList's own initialize() to
 * construct it at its final size in one pass:
 *   - top edge (y) starts exactly where the help window ends
 *     (fittingHeight(3) + fittingHeight(2))
 *   - bottom edge stays anchored at the same position PH_Warehouse
 *     originally used, so the gap above the info window at the
 *     bottom of the screen is unaffected
 * ----------------------------------------------------------------------
 */

(function() {

    Window_WarehouseItemList.prototype.initialize = function() {
        var helpY = this.fittingHeight(3);
        var helpHeight = this.fittingHeight(2);
        var originalBottom = this.fittingHeight(5) + (Graphics.boxHeight - this.fittingHeight(7));

        var y = helpY + helpHeight;
        var height = originalBottom - y;

        Window_ItemList.prototype.initialize.call(this, 0, y, Graphics.boxWidth, height);
    };

})();

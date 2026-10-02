/*:
 * @plugindesc Live-previews the item list as the cursor moves between Withdraw and Deposit, before OK is pressed.
 * @author Andrew
 *
 * @help
 * Andrew_WarehouseOptionPreview.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseOption globally.
 *
 * PHPlugins.PHWarehouse._lastOption (which controls whether the item
 * list shows storage contents or inventory contents) is normally only
 * updated when OK is pressed, via Window_WarehouseOption.changeOption().
 * The item list itself already refreshes continuously every frame
 * regardless of focus (Window_WarehouseCategory.update() does this
 * unconditionally), so it's already "live" in that sense — it just
 * wasn't tracking the option cursor's position before commitment.
 *
 * This aliases Window_WarehouseOption.prototype.select() (called
 * every time the cursor moves, including the initial selection at
 * scene start) to set _lastOption to match the cursor position
 * immediately — the same value changeOption() would set on OK, just
 * live instead of deferred — and forces an immediate category/item
 * refresh so there's no one-frame lag. Pressing OK still calls
 * changeOption() as before; since it just re-sets _lastOption to the
 * same value this plugin already set, there's no conflict.
 * ----------------------------------------------------------------------
 */

(function() {

    var _Window_WarehouseOption_select = Window_WarehouseOption.prototype.select;
    Window_WarehouseOption.prototype.select = function(index) {
        _Window_WarehouseOption_select.call(this, index);
        this.updateWarehousePreview();
    };

    Window_WarehouseOption.prototype.updateWarehousePreview = function() {
        PHPlugins.PHWarehouse._lastOption = this.index();

        var scene = SceneManager._scene;
        if (scene && scene._categoryWindow && scene._itemWindow) {
            scene._categoryWindow.changeCategory();
            scene._itemWindow.refresh();
        }
    };

})();
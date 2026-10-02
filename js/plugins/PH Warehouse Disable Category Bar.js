/*:
 * @plugindesc Shows the hovered item's description (matching standard item menus) in the space vacated by the hidden category bar.
 * @author Andrew
 *
 * @help
 * Andrew_WarehouseItemHelp.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list. Intended to be
 * used together with Andrew_HideWarehouseCategoryBar.js and
 * Andrew_ResizeItemListForHelp.js. Do NOT use alongside
 * Andrew_ExpandItemListIntoCategoryGap.js — remove that one from your
 * plugin list, since it expands the item list into the same space
 * this plugin uses for the description window.
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse globally
 * (window.Scene_Warehouse = Scene_Warehouse;) since the class is
 * otherwise scoped inside PH_Warehouse's own closure. Window_Help is
 * a vanilla engine class and is always globally available.
 *
 * Adds a 2-line Window_Help subclass (matching the help window size
 * used in Scene_Item and other standard item menus), positioned at
 * the same spot the category bar used to occupy (y = fittingHeight(3)),
 * and wires it up as the item list's help window via setHelpWindow().
 * Window_ItemList already calls updateHelp() -> setHelpWindowItem(this.item())
 * automatically whenever the selected item changes, so no changes to
 * the item list itself are needed here — the description just updates
 * as the cursor moves.
 *
 * This plugin only creates and positions the help window. Resizing
 * the item list to fit beneath it is handled separately by
 * Andrew_ResizeItemListForHelp.js, which computes the same
 * fittingHeight(3)/fittingHeight(2) numbers independently rather than
 * reading them from this plugin's window instance — so the two have
 * no runtime dependency on each other. If you change the line count
 * or position here, update the matching numbers in that plugin too.
 *
 * updateHelp() only fires when the item list's own selection changes
 * (Window_ItemList's built-in behavior), so once the player backs out
 * to the Withdraw/Deposit option screen, whatever description was
 * last shown just sits there — nothing tells the help window to
 * clear. This checks every frame in Scene_Warehouse.prototype.update():
 * whenever the item list isn't active, the help window is cleared.
 * Window_Help.prototype.clear() is a no-op once already empty, so this
 * is cheap to call unconditionally while outside the item list.
 * ----------------------------------------------------------------------
 */

(function() {

    function Window_WarehouseHelp() {
        this.initialize.apply(this, arguments);
    }
    Window_WarehouseHelp.prototype = Object.create(Window_Help.prototype);
    Window_WarehouseHelp.prototype.constructor = Window_WarehouseHelp;

    Window_WarehouseHelp.prototype.initialize = function() {
        Window_Help.prototype.initialize.call(this, 2);
        this.y = this.fittingHeight(3);
    };

    Scene_Warehouse.prototype.createHelpWindow = function() {
        this._helpWindow = new Window_WarehouseHelp();
        this.addWindow(this._helpWindow);
    };

    var _Scene_Warehouse_createCategory = Scene_Warehouse.prototype.createCategory;
    Scene_Warehouse.prototype.createCategory = function() {
        _Scene_Warehouse_createCategory.call(this);
        this.createHelpWindow();
    };

    var _Scene_Warehouse_createItemList = Scene_Warehouse.prototype.createItemList;
    Scene_Warehouse.prototype.createItemList = function() {
        _Scene_Warehouse_createItemList.call(this);
        this._itemWindow.setHelpWindow(this._helpWindow);
    };

    var _Scene_Warehouse_update = Scene_Warehouse.prototype.update;
    Scene_Warehouse.prototype.update = function() {
        _Scene_Warehouse_update.call(this);
        if (this._helpWindow && this._itemWindow && !this._itemWindow.active) {
            if (this._helpWindow._text && this._helpWindow._text !== '') {
                console.log('[Andrew_WarehouseItemHelp] clearing stale help text: "' + this._helpWindow._text + '" (itemWindow.active=' + this._itemWindow.active + ')');
            }
            this._helpWindow.clear();
        }
    };

})();
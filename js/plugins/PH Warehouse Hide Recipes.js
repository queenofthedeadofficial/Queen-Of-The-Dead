/*:
 * @plugindesc Prevents any storage unit from listing items tagged <Category: Recipe>.
 * @author Andrew
 *
 * @help
 * Andrew_HideRecipeItemsInStorage.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseItemList globally
 * (window.Window_WarehouseItemList = Window_WarehouseItemList;) since
 * the class is otherwise scoped inside PH_Warehouse's own closure.
 *
 * Any item, weapon, or armor with the notetag <Category: Recipe> will
 * be filtered out of both the Withdraw list (storage contents) and the
 * Deposit list (party inventory) inside every warehouse/storage unit.
 * This is a display-only filter: it does not touch $gameParty or the
 * warehouse's stored data, so if a Recipe-tagged item somehow already
 * exists in storage it's simply not shown, not deleted.
 * ----------------------------------------------------------------------
 */

(function() {

    var _Window_WarehouseItemList_loadItems = Window_WarehouseItemList.prototype.loadItems;
    Window_WarehouseItemList.prototype.loadItems = function() {
        _Window_WarehouseItemList_loadItems.call(this);
        this.filterOutRecipeItems();
    };

    Window_WarehouseItemList.prototype.filterOutRecipeItems = function() {
        this._data = this._data.filter(function(item) {
            if (item === null) {
                return true;
            }
            var category = item.meta && item.meta.Category ? String(item.meta.Category).trim() : '';
            return category.toLowerCase() !== 'recipe';
        });
    };

})();
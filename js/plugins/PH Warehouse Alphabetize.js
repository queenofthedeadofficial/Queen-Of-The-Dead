/*:
 * @plugindesc Sorts PH_Warehouse item lists (both Withdraw and Deposit) alphabetically by name.
 * @author Andrew
 *
 * @help
 * Andrew_SortWarehouseAlphabetical.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * PH_Warehouse normally lists stored items in "order first deposited"
 * (see PHWarehouseManager.prototype.getItems / deposit). This plugin
 * aliases Window_WarehouseItemList.prototype.loadItems, which is the
 * single point both the Withdraw list (makeWarehouseItemList) and the
 * Deposit lists (makeItemList / makeDepositAllItemList) pass through,
 * and re-sorts the resulting _data array alphabetically by item name.
 *
 * The "null" sentinel entry PH_Warehouse sometimes appends (used for
 * an "All" style empty slot) is preserved and kept at the end of the
 * list rather than being sorted in.
 *
 * No edits to PH_Warehouse.js are required.
 * ----------------------------------------------------------------------
 */

(function() {

    var _Window_WarehouseItemList_loadItems = Window_WarehouseItemList.prototype.loadItems;
    Window_WarehouseItemList.prototype.loadItems = function() {
        _Window_WarehouseItemList_loadItems.call(this);
        this.sortItemsAlphabetically();
    };

    Window_WarehouseItemList.prototype.sortItemsAlphabetically = function() {
        var hasNull = this._data.indexOf(null) > -1;

        var items = this._data.filter(function(item) {
            return item !== null;
        });

        items.sort(function(a, b) {
            var nameA = (a && a.name) ? a.name : '';
            var nameB = (b && b.name) ? b.name : '';
            return nameA.localeCompare(nameB);
        });

        if (hasNull) {
            items.push(null);
        }

        this._data = items;
    };

})();
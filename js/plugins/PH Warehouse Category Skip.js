/*:
 * @plugindesc Skips PH_Warehouse's category selection step. OK on Withdraw/Deposit
 * jumps straight to the item list; Cancel from the item list returns straight
 * to the Withdraw/Deposit selection.
 * @author Andrew
 *
 * @help
 * Andrew_WarehouseSkipCategoryStep.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse globally
 * (window.Scene_Warehouse = Scene_Warehouse;) since the class is
 * otherwise scoped inside PH_Warehouse's own closure.
 *
 * Default PH_Warehouse flow:
 *   Option window (Withdraw/Deposit) -> Category window (item/weapon/
 *   armor/keyItem tabs) -> Item list
 *
 * This plugin removes the category window as an interactive step:
 *   - OK on the option window selects category index 0 automatically
 *     and activates the item list directly (Deposit -> your inventory,
 *     Withdraw -> that storage unit's items).
 *   - Cancel on the item list deselects the category window and
 *     returns focus straight to the option window.
 *
 * Note: if you have more than one category enabled (e.g. Item AND
 * Weapon AND Armor), this plugin makes the category window entirely
 * non-interactive, so only category index 0 (the first enabled
 * category, or "All" if the "All Together" parameter is on) will ever
 * be reachable through normal play. If you need multiple categories
 * to stay selectable, let me know and I can add a shoulder-button
 * (L/R) category cycle to the item list instead of removing the
 * category step outright.
 * ----------------------------------------------------------------------
 */

(function() {

    Scene_Warehouse.prototype.onOptionOk = function() {
        this._optionWindow.changeOption();
        this._optionWindow.deactivate();

        this._categoryWindow.select(0);
        this._categoryWindow.deactivate();
        this._categoryWindow.changeCategory();
        this._itemWindow.refresh();

        this._itemWindow.activate();
        this._itemWindow.select(this._itemWindow._data.length > 0 ? 0 : -1);
    };

    Scene_Warehouse.prototype.onItemCancel = function() {
        this._itemWindow.deselect();
        this._itemWindow.deactivate();

        this._categoryWindow.deselect();

        this._optionWindow.activate();
    };

})();
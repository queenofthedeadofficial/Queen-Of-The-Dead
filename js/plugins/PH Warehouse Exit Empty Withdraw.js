/*:
 * @plugindesc Exits back to the Withdraw/Deposit screen, cursor on Withdraw, when the last item in a storage unit is withdrawn.
 * @author Andrew
 *
 * @help
 * Andrew_ExitOnEmptyWithdraw.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse globally
 * (window.Scene_Warehouse = Scene_Warehouse;).
 *
 * Aliases Scene_Warehouse.prototype.onItemOk. After a withdraw that
 * empties the storage unit, backs out of the item list to the option
 * window (same as cancelling) and selects Withdraw (index 0).
 * ----------------------------------------------------------------------
 */

(function() {

    var _Scene_Warehouse_onItemOk = Scene_Warehouse.prototype.onItemOk;
    Scene_Warehouse.prototype.onItemOk = function() {
        _Scene_Warehouse_onItemOk.call(this);

        var isWithdraw = PHPlugins.PHWarehouse._lastOption === 0;
        var isEmpty = PHPlugins.PHWarehouse.getCurrentCapacity(PHPlugins.PHWarehouse._lastActive) === 0;

        if (isWithdraw && isEmpty) {
            this._itemWindow.deselect();
            this._itemWindow.deactivate();
            this._categoryWindow.deselect();
            this._optionWindow.select(0);
            this._optionWindow.activate();
        }
    };

})();

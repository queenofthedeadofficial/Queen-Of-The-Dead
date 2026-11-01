/*:
 * @plugindesc Refreshes the Withdraw command's enabled/disabled color immediately after any deposit or withdraw.
 * @author Andrew
 *
 * @help
 * Andrew_RefreshWithdrawColorOnMove.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js AND Andrew_DisableEmptyWithdraw.js
 * in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse globally
 * (window.Scene_Warehouse = Scene_Warehouse;) since the class is
 * otherwise scoped inside PH_Warehouse's own closure.
 *
 * Window_WarehouseOption.refresh() (patched by
 * Andrew_DisableEmptyWithdraw.js) only ever runs once, at scene
 * creation, so the Withdraw command's greyed-out state never updates
 * again after that even once the storage unit stops being empty.
 *
 * This aliases Scene_Warehouse.prototype.onItemOk (fired every time an
 * item is deposited or withdrawn) and refreshes the option window
 * afterward, so the Withdraw command's color updates immediately:
 * back to normal the moment the first item is deposited, and greyed
 * out again if the last item is withdrawn.
 * ----------------------------------------------------------------------
 */

(function() {

    var _Scene_Warehouse_onItemOk = Scene_Warehouse.prototype.onItemOk;
    Scene_Warehouse.prototype.onItemOk = function() {
        _Scene_Warehouse_onItemOk.call(this);
        this._optionWindow.refresh();
    };

})();
/*:
 * @plugindesc Greys out and disables the Withdraw command when a storage unit has no items stored.
 * @author Andrew
 *
 * @help
 * Andrew_DisableEmptyWithdraw.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js in the plugin list.
 *
 * Requires PH_Warehouse.js to expose Window_WarehouseOption globally
 * (window.Window_WarehouseOption = Window_WarehouseOption;) since the
 * class is otherwise scoped inside PH_Warehouse's own closure.
 *
 * Window_WarehouseOption (the Withdraw/Deposit selector) is a
 * Window_Selectable with no built-in per-command enabled/disabled
 * state, so this adds one: index 0 (Withdraw) is treated as disabled
 * whenever PHPlugins.PHWarehouse.getCurrentCapacity(_lastActive) is 0
 * for the storage unit currently open. Deposit (index 1) is
 * unaffected.
 *
 * Disabled means: drawn at reduced opacity, and pressing OK on it
 * plays the buzzer sound instead of confirming (Window_Selectable's
 * default processOk behavior once isCurrentItemEnabled returns false).
 * ----------------------------------------------------------------------
 */

(function() {

    Window_WarehouseOption.prototype.isWithdrawEnabled = function() {
        var title = PHPlugins.PHWarehouse._lastActive;
        return PHPlugins.PHWarehouse.getCurrentCapacity(title) > 0;
    };

    Window_WarehouseOption.prototype.isCurrentItemEnabled = function() {
        if (this._index === 0) {
            return this.isWithdrawEnabled();
        }
        return true;
    };

    Window_WarehouseOption.prototype.refresh = function() {
        this.contents.clear();

        var rectWithdraw = this.itemRectForText(0);
        var rectDeposit = this.itemRectForText(1);

        this.changePaintOpacity(this.isWithdrawEnabled());
        this.drawText(this.withdrawText, rectWithdraw.x, rectWithdraw.y, rectWithdraw.width, "center");
        this.changePaintOpacity(true);

        this.drawText(this.depositText, rectDeposit.x, rectDeposit.y, rectDeposit.width, "center");
    };

})();
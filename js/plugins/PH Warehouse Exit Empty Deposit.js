/*:
 * @plugindesc Exits back to the Withdraw/Deposit screen, cursor on Deposit, when no item in the party's inventory is still eligible for that storage unit. Also greys out Deposit under the same condition.
 * @author Andrew
 *
 * @help
 * Andrew_ExitOnEmptyDeposit.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js AND BELOW Andrew_DisableEmptyWithdraw.js
 * in the plugin list. The Deposit-greying half of this plugin aliases
 * Window_WarehouseOption.prototype.isCurrentItemEnabled/refresh rather
 * than replacing them, specifically so it composes correctly with
 * Andrew_DisableEmptyWithdraw.js's Withdraw-greying (which DOES fully
 * replace those methods). If this plugin loaded first instead, Andrew_
 * DisableEmptyWithdraw.js's replacement would silently wipe out the
 * Deposit-greying added here.
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse AND
 * Window_WarehouseOption globally.
 *
 * Part 1 — auto-exit (unchanged from the previous version): checks
 * every frame in Scene_Warehouse.prototype.update() whenever Deposit
 * is active and the item list has input focus, via
 * PHPlugins.PHWarehouse.verifyItem() against the whole party
 * inventory. See hasAnyDepositableItem() below — both this and the
 * greying logic share the same eligibility check now.
 *
 * Part 2 — greying: mirrors Andrew_DisableEmptyWithdraw.js's pattern
 * for the Deposit command (index 1) instead of Withdraw (index 0).
 * isCurrentItemEnabled() is aliased to fall through to whatever it
 * already was for any index other than 1. refresh() is aliased to
 * call through first (so Withdraw's already-correct graying and
 * Deposit's default un-greyed draw both happen), then redraws just
 * Deposit's own rectangle with correct opacity — using clearRect() on
 * only that region rather than a full contents.clear(), so Withdraw's
 * just-drawn text isn't erased and Deposit's text doesn't get drawn
 * twice on top of itself (which previously caused a bold/stacked
 * outline artifact when this window's refresh() was called
 * repeatedly).
 * ----------------------------------------------------------------------
 */

(function() {

    Scene_Warehouse.prototype.hasAnyDepositableItem = function() {
        return $gameParty.allItems().some(function(item) {
            var ok = PHPlugins.PHWarehouse.verifyItem(item);
            PHPlugins.PHWarehouse.undoAllTogetherVerification();
            return ok;
        });
    };

    var _Scene_Warehouse_update = Scene_Warehouse.prototype.update;
    Scene_Warehouse.prototype.update = function() {
        _Scene_Warehouse_update.call(this);
        this.checkEmptyDepositExit();
    };

    Scene_Warehouse.prototype.checkEmptyDepositExit = function() {
        var isDeposit = (PHPlugins.PHWarehouse._lastOption === 1);
        if (!isDeposit || !this._itemWindow.active) {
            return;
        }

        if (!this.hasAnyDepositableItem()) {
            this._itemWindow.deselect();
            this._itemWindow.deactivate();
            this._categoryWindow.deselect();
            this._optionWindow.select(1);
            this._optionWindow.activate();
        }
    };

    var _Window_WarehouseOption_isCurrentItemEnabled = Window_WarehouseOption.prototype.isCurrentItemEnabled;
    Window_WarehouseOption.prototype.isCurrentItemEnabled = function() {
        if (this._index === 1) {
            return this.isDepositEnabled();
        }
        return _Window_WarehouseOption_isCurrentItemEnabled.call(this);
    };

    Window_WarehouseOption.prototype.isDepositEnabled = function() {
        return SceneManager._scene.hasAnyDepositableItem();
    };

    var _Window_WarehouseOption_refresh = Window_WarehouseOption.prototype.refresh;
    Window_WarehouseOption.prototype.refresh = function() {
        _Window_WarehouseOption_refresh.call(this);

        var rectDeposit = this.itemRectForText(1);
        this.contents.clearRect(rectDeposit.x, rectDeposit.y, rectDeposit.width, rectDeposit.height);
        this.changePaintOpacity(this.isDepositEnabled());
        this.drawText(this.depositText, rectDeposit.x, rectDeposit.y, rectDeposit.width, "center");
        this.changePaintOpacity(true);
    };

})();
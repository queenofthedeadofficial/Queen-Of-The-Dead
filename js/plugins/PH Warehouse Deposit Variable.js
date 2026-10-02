/*:
 * @plugindesc Prompts for a quantity (via number input) when withdrawing/depositing a stack of more than 1. Cancel aborts the prompt.
 * @author Andrew
 *
 * @help
 * Andrew_MultiQuantityTransfer.js
 * ----------------------------------------------------------------------
 * Place this BELOW PH_Warehouse.js (and below Andrew_ExitOnEmptyWithdraw.js
 * and Andrew_RefreshWithdrawColorOnMove.js, if you're using them — this
 * plugin needs to see the fully chained onItemOk behavior those add).
 *
 * Requires PH_Warehouse.js to expose Scene_Warehouse globally
 * (window.Scene_Warehouse = Scene_Warehouse;).
 *
 * *** CONFIGURE BEFORE USE ***
 * QUANTITY_VARIABLE_ID below must be set to a Game Variable ID that
 * is NOT used for anything else in your project. This plugin uses it
 * purely as scratch space to read the player's number input, and
 * resets it to 1 immediately after every use (including on cancel).
 *
 * Behavior:
 *   - OK on an item with a party/storage quantity of 1 behaves exactly
 *     as before (falls straight through to the existing onItemOk
 *     chain, no prompt).
 *   - OK on an item with a quantity greater than 1 opens a message box
 *     at the bottom of the screen reading "Withdraw how many X?" or
 *     "Deposit how many X?" (X = item name), followed by a 3-digit
 *     number input. The available maximum is the quantity in storage
 *     (withdraw) or in the party's inventory (deposit); the number
 *     input UI itself only limits digit count, not an arbitrary max,
 *     so the entered value is clamped down to the real maximum
 *     (floor of 1) once confirmed.
 *   - Cancel on the number input aborts the whole operation: no items
 *     are moved, the message/number input close, and the quantity
 *     variable resets to 1.
 *   - Once confirmed (not cancelled), the existing onItemOk chain
 *     (moveItem, window refreshes, the empty-withdraw exit behavior,
 *     etc.) is invoked once per unit, so none of that logic needs to
 *     be duplicated or reimplemented here.
 *
 * In PH_Warehouse's "All Together" display mode, PHPlugins.PHWarehouse
 * ._lastCategory is the literal string 'all' rather than a real
 * category key, and the storage's items/qtty lookup tables are keyed
 * by real category only ('item'/'weapon'/'armor'/'keyItem'). The core
 * plugin's own deposit()/withdraw() handle this by calling
 * verifyAllTogether(item) beforehand (which temporarily swaps
 * _lastCategory to the item's real category) and
 * undoAllTogetherVerification() afterward (which swaps it back to
 * 'all'). This plugin's storage-quantity lookup (via hasItems()) does
 * the same wrap for the same reason.
 *
 * Scene_Warehouse doesn't include a message window by default (it's
 * not Scene_Map), so this also adds one, mirroring the same setup
 * Scene_Map itself uses (Window_Message + its subWindows(), which
 * includes the number input window).
 *
 * Window_NumberInput has no cancel handler by default (the vanilla
 * "Input Number" event command can't be backed out of), so one is
 * registered here specifically for this prompt. Rather than assuming
 * Window_Message._numberInputWindow exists the instant Window_Message
 * is constructed (this can vary — e.g. YEP_MessageCore and other
 * message-related plugins sometimes restructure Window_Message's
 * sub-window creation/timing), the hookup retries every frame in
 * update() until the number input window actually exists, then
 * attaches the handler once.
 * ----------------------------------------------------------------------
 */

(function() {

    var QUANTITY_VARIABLE_ID = 4970;

    var _Scene_Warehouse_create = Scene_Warehouse.prototype.create;
    Scene_Warehouse.prototype.create = function() {
        _Scene_Warehouse_create.call(this);
        this.createWarehouseMessageWindow();
    };

    Scene_Warehouse.prototype.createWarehouseMessageWindow = function() {
        this._messageWindow = new Window_Message();
        this.addWindow(this._messageWindow);
        this._messageWindow.subWindows().forEach(function(win) {
            this.addWindow(win);
        }, this);
    };

    Scene_Warehouse.prototype.tryHookNumberInputCancel = function() {
        var win = this._messageWindow ? this._messageWindow._numberInputWindow : null;
        if (win) {
            win.setHandler('cancel', this.onWarehouseQuantityCancel.bind(this));
            this._numberInputWindow = win;
            this._numberInputCancelHooked = true;
        }
    };

    Scene_Warehouse.prototype.onWarehouseQuantityCancel = function() {
        SoundManager.playCancel();

        this._pendingQuantityMove = null;
        $gameVariables.setValue(QUANTITY_VARIABLE_ID, 1);

        $gameMessage.clear();
        this._numberInputWindow.deactivate();
        this._numberInputWindow.close();
        this._messageWindow.close();

        this._itemWindow.activate();
    };

    var _Scene_Warehouse_update = Scene_Warehouse.prototype.update;
    Scene_Warehouse.prototype.update = function() {
        _Scene_Warehouse_update.call(this);

        if (!this._numberInputCancelHooked) {
            this.tryHookNumberInputCancel();
        }

        if (this._pendingQuantityMove && !$gameMessage.isBusy()) {
            var pending = this._pendingQuantityMove;
            this._pendingQuantityMove = null;

            var qty = $gameVariables.value(QUANTITY_VARIABLE_ID).clamp(1, pending.maxQty);
            $gameVariables.setValue(QUANTITY_VARIABLE_ID, 1);

            for (var i = 0; i < qty; i++) {
                _Scene_Warehouse_onItemOk.call(this);
            }
        }
    };

    Scene_Warehouse.prototype.getWarehouseItemMaxQty = function(item, isWithdraw) {
        if (!isWithdraw) {
            return $gameParty.numItems(item);
        }
        PHPlugins.PHWarehouse.verifyAllTogether(item);
        var qty = PHPlugins.PHWarehouse.hasItems(PHPlugins.PHWarehouse._lastActive, item.id, PHPlugins.PHWarehouse._lastCategory);
        PHPlugins.PHWarehouse.undoAllTogetherVerification();
        return qty;
    };

    var _Scene_Warehouse_onItemOk = Scene_Warehouse.prototype.onItemOk;
    Scene_Warehouse.prototype.onItemOk = function() {
        var item = this._itemWindow.item();
        var isWithdraw = (PHPlugins.PHWarehouse._lastOption === 0);
        var maxQty = this.getWarehouseItemMaxQty(item, isWithdraw);

        if (maxQty <= 1) {
            _Scene_Warehouse_onItemOk.call(this);
            return;
        }

        this._itemWindow.deactivate();

        $gameVariables.setValue(QUANTITY_VARIABLE_ID, 1);
        var prompt = (isWithdraw ? 'Withdraw how many ' : 'Deposit how many ') + item.name + '?';
        $gameMessage.add(prompt);
        $gameMessage.setNumberInput(QUANTITY_VARIABLE_ID, 3);

        this._pendingQuantityMove = { maxQty: maxQty };
    };

})();
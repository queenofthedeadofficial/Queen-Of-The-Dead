/*:
 * @plugindesc PHW Init LootBonus - ensures PH_Warehouse warehouse objects have lootBonus = 0 to avoid undefined errors.
 * @author Minimal
 * @help
 * Minimal plugin. No parameters.
 */

(function() {
  'use strict';

  function ensureLootBonusForAll(manager) {
    if (!manager) return;
    if (!manager._warehouses) manager._warehouses = [];
    for (var i = 0; i < manager._warehouses.length; i++) {
      if (!manager._warehouses[i]) manager._warehouses[i] = {};
      if (typeof manager._warehouses[i].lootBonus === 'undefined' || manager._warehouses[i].lootBonus === null) {
        manager._warehouses[i].lootBonus = 0;
      }
    }
  }

  function tryPatch() {
    if (typeof PHWarehouseManager === 'undefined') return false;
    if (PHWarehouseManager.prototype._initLootBonusPatched) return true;

    var _open = PHWarehouseManager.prototype.openWarehouse;
    PHWarehouseManager.prototype.openWarehouse = function(warehouseId) {
      if (!this._warehouses) this._warehouses = [];
      if (typeof warehouseId === 'undefined' || warehouseId === null) warehouseId = 0;
      if (!this._warehouses[warehouseId]) this._warehouses[warehouseId] = { items: [], lootBonus: 0 };
      if (typeof this._warehouses[warehouseId].lootBonus === 'undefined' || this._warehouses[warehouseId].lootBonus === null) {
        this._warehouses[warehouseId].lootBonus = 0;
      }
      ensureLootBonusForAll(this);
      return _open.call(this, warehouseId);
    };

    PHWarehouseManager.prototype._initLootBonusPatched = true;
    return true;
  }

  // Try to patch immediately (covers when PH_Warehouse is loaded earlier)
  tryPatch();

  // If PH_Warehouse loads later, patch during boot
  var _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);
    tryPatch();
  };

  // Ensure initialization after a saved game loads
  var _DataManager_onLoad = DataManager.onLoad;
  DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    if (object && object === $gameSystem) {
      // If the warehouse manager exists on load, ensure lootBonus
      if (typeof PHWarehouseManager !== 'undefined') {
        // If PHWarehouseManager is a singleton instance name in your project, adjust accordingly.
        // This plugin assumes the manager instance will be accessible via a global variable or prototype methods.
        // Try to find an instance on $gameSystem if PH_Warehouse stores it there:
        if ($gameSystem && $gameSystem._phWarehouseManager) {
          ensureLootBonusForAll($gameSystem._phWarehouseManager);
        }
      }
    }
  };

})();

/*:
 * @plugindesc Skip Armor selection in Warehouse UI. Withdraw/Deposit go straight to storage; Cancel in storage returns to Withdraw/Deposit choices.
 * @author Copilot
 * @help
 * Drop this file into js/plugins and enable it.
 */

(function() {
  'use strict';

  // --- 1) Remove Armor from the category command list ---
  if (window.Window_WarehouseCategory && Window_WarehouseCategory.prototype.makeCommandList) {
    var _WWC_makeCommandList = Window_WarehouseCategory.prototype.makeCommandList;
    Window_WarehouseCategory.prototype.makeCommandList = function() {
      // Defensive: if original exists but we want only Withdraw/Deposit, rebuild minimal list
      // Use addCommand signature common to Window_Command: addCommand(name, symbol, enabled, ext)
      if (typeof this.clearCommandList === 'function') {
        try { this.clearCommandList(); } catch (e) {}
      }
      // If your project uses localized text keys, replace the strings below with the appropriate keys.
      if (typeof this.addCommand === 'function') {
        this.addCommand('Withdraw', 'withdraw');
        this.addCommand('Deposit', 'deposit');
      } else {
        // Fallback: call original and then try to remove 'armor' entries by filtering
        _WWC_makeCommandList.call(this);
        try {
          if (this._list && Array.isArray(this._list)) {
            this._list = this._list.filter(function(cmd){
              return cmd && cmd.symbol !== 'armor' && (cmd.name !== 'Armor' && cmd.name !== 'armor');
            });
          }
        } catch(e){}
      }
    };
  }

  // --- 2) Helper to open storage directly and set mode ---
  function _warehouseOpenStorage(scene, mode) {
    if (!scene) return;
    // Ensure storage window exists; try to call scene.createStorageWindow if available
    if (!scene._storageWindow) {
      if (typeof scene.createStorageWindow === 'function') {
        try { scene.createStorageWindow(); } catch (e) { console.warn('createStorageWindow threw', e); }
      }
    }
    // If still not present, try to find a window named _storageWindow
    if (!scene._storageWindow) {
      console.warn('Storage window not found on scene', scene);
      return;
    }
    // Set mode on scene and on storage window if supported
    scene._storageMode = mode;
    if (scene._storageWindow && typeof scene._storageWindow.setMode === 'function') {
      try { scene._storageWindow.setMode(mode); } catch (e) {}
    } else {
      // fallback: set a property the storage window can read
      try { scene._storageWindow._mode = mode; } catch (e) {}
    }
    // Refresh and activate storage window
    try {
      if (typeof scene._storageWindow.refresh === 'function') scene._storageWindow.refresh();
      if (typeof scene._storageWindow.select === 'function') scene._storageWindow.select(0);
      if (typeof scene._storageWindow.activate === 'function') scene._storageWindow.activate();
    } catch (e) { console.warn('Error activating storage window', e); }
    // Deactivate category window so focus is clear
    try { if (scene._categoryWindow && typeof scene._categoryWindow.deactivate === 'function') scene._categoryWindow.deactivate(); } catch(e){}
  }

  // --- 3) Bind handlers on category window when it's created ---
  if (window.Scene_Warehouse && Scene_Warehouse.prototype.createCategoryWindow) {
    var _SW_createCategoryWindow = Scene_Warehouse.prototype.createCategoryWindow;
    Scene_Warehouse.prototype.createCategoryWindow = function() {
      _SW_createCategoryWindow.call(this);
      // Bind handlers if category window exists
      try {
        if (!this._categoryWindow) return;
        // Remove any existing handlers for safety
        try { this._categoryWindow.setHandler('ok', null); } catch(e){}
        try { this._categoryWindow.setHandler('cancel', null); } catch(e){}

        // Bind withdraw and deposit to open storage directly
        this._categoryWindow.setHandler('withdraw', function() {
          _warehouseOpenStorage(this, 'withdraw
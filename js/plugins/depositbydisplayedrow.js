/*:
 * @plugindesc PH Warehouse Deposit Fix — ensure deposit uses the DB object shown in the selected row (UI-only)
 * @author Patch
 * @help
 * - Enable after PH_Warehouse and any display-filter plugins.
 * - Non-destructive: preserves original onItemOk and falls back if needed.
 * - Use PH_Warehouse_DepositByDisplayedRow.restoreOriginal() to revert at runtime.
 */

(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_DepositByDisplayedRow';

  // Guard: only install if Scene_Warehouse exists at runtime
  function install(){
    try {
      var SceneProto = window.Scene_Warehouse && window.Scene_Warehouse.prototype;
      if(!SceneProto) return console.log(PLUGIN + ': Scene_Warehouse not found; installer will retry on scene change.');

      if(SceneProto._ph_deposit_by_displayed_installed) return console.log(PLUGIN + ': already installed');

      // Save original
      SceneProto._ph_orig_onItemOk = SceneProto.onItemOk;

      // New handler
      SceneProto.onItemOk = function(){
        try {
          // find the item window used for selection
          var w = this._itemWindow || (function(){
            for(var k in this){
              if(this[k] && Array.isArray(this[k]._data)) return this[k];
            }
            return null;
          }).call(this);

          if(!w || !Array.isArray(w._data)) {
            // fallback to original if we can't find the window
            return SceneProto._ph_orig_onItemOk.apply(this, arguments);
          }

          // resolve displayed candidate (DB object or wrapper)
          var idx = (typeof w.index === 'function') ? w.index() : (w._index || 0);
          var displayed = w._data[idx];
          var displayedCand = displayed && (displayed.item || displayed.object || displayed._item) || displayed;

          // Resolve DB object if wrapper contains id
          var dbObj = null;
          if(displayedCand && (displayedCand.id || displayedCand.itemId || displayedCand._id)){
            var id = displayedCand.id || displayedCand.itemId || displayedCand._id;
            dbObj = ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]) || null;
          }

          var ph = window.PHPlugins && PHPlugins.PHWarehouse;
          // If PH deposit exists, try to call it with the displayed DB object (or wrapper) directly
          if(ph && typeof ph.deposit === 'function'){
            var arg = dbObj || displayedCand || displayed;
            try {
              // Many PH variants accept either DB object or id; try object first then id
              ph.deposit(arg);
              // refresh windows and return early to avoid double-calling original
              try { if(typeof this._itemWindow.refresh === 'function') this._itemWindow.refresh(); } catch(e){}
              try { if(typeof this._storageWindow === 'object' && typeof this._storageWindow.refresh === 'function') this._storageWindow.refresh(); } catch(e){}
              return;
            } catch(e){
              // if direct call fails, fall through to original handler
              console.warn(PLUGIN + ': ph.deposit with displayed candidate failed, falling back to original onItemOk', e);
            }
          }
        } catch(err){
          console.warn(PLUGIN + ': onItemOk wrapper error, falling back to original', err);
        }
        // fallback: call original handler
        return SceneProto._ph_orig_onItemOk.apply(this, arguments);
      };

      SceneProto._ph_deposit_by_displayed_installed = true;
      console.log(PLUGIN + ': installed. Deposits will prefer the displayed row candidate.');
    } catch(e){
      console.warn(PLUGIN + ': install error', e);
    }
  }

  // Installer: try immediately and again when scene changes
  install();
  var lastScene = SceneManager._scene;
  var installerId = setInterval(function(){
    try {
      if(SceneManager._scene !== lastScene){
        lastScene = SceneManager._scene;
        install();
      }
    } catch(e){}
  }, 250);

  // Public API to restore original onItemOk
  window.PH_Warehouse_DepositByDisplayedRow = window.PH_Warehouse_DepositByDisplayedRow || {};
  window.PH_Warehouse_DepositByDisplayedRow.restoreOriginal = function(){
    try {
      var SceneProto = window.Scene_Warehouse && window.Scene_Warehouse.prototype;
      if(!SceneProto) return console.log(PLUGIN + ': Scene_Warehouse not found');
      if(SceneProto._ph_orig_onItemOk){
        SceneProto.onItemOk = SceneProto._ph_orig_onItemOk;
        delete SceneProto._ph_orig_onItemOk;
        delete SceneProto._ph_deposit_by_displayed_installed;
        console.log(PLUGIN + ': restored original Scene_Warehouse.onItemOk');
      } else {
        console.log(PLUGIN + ': no original handler saved');
      }
    } catch(e){ console.warn(PLUGIN + ': restoreOriginal error', e); }
  };

})();

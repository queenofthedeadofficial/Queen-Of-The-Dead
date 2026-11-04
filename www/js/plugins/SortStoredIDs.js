/*:
 * @plugindesc Use Scene_Item's item window data for PH Warehouse deposit lists. Place after PH_Warehouse.
 * @author You
 * @help
 * When the player is depositing (PHWarehouse._lastOption === 1) and the active scene
 * is Scene_Item, this plugin makes PHWarehouse getters return the Scene_Item's
 * item window _data (which is already alphabetized by the engine).
 *
 * Safe fallback to original behavior is preserved.
 */
(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_UseSceneItemData';

  function whenPHReady(cb, tries) {
    tries = typeof tries === 'number' ? tries : 40;
    if (window.PHPlugins && PHPlugins.PHWarehouse) return cb();
    if (tries <= 0) {
      console.warn(PLUGIN + ': PHPlugins.PHWarehouse not found; aborting.');
      return;
    }
    setTimeout(function(){ whenPHReady(cb, tries - 1); }, 100);
  }

  whenPHReady(function(){
    var mgr = PHPlugins.PHWarehouse;
    if (!mgr) {
      console.warn(PLUGIN + ': manager missing after wait; aborting.');
      return;
    }

    // Resolve prototype (some versions attach methods to prototype)
    var proto = Object.getPrototypeOf(mgr) || (mgr.constructor && mgr.constructor.prototype) || mgr;

    // Helper: try to get Scene_Item's item window data for the current category
    function sceneItemDataForCategory(category) {
      var scene = SceneManager._scene;
      if (!scene) return null;
      // Only use Scene_Item when depositing (lastOption === 1)
      if (mgr._lastOption !== 1) return null;
      // Scene_Item normally exposes this._itemWindow (Window_ItemList)
      var itemWindow = scene._itemWindow || scene._itemList || scene._itemWindow;
      if (!itemWindow || !Array.isArray(itemWindow._data)) return null;
      // itemWindow._data is an array of DB objects or wrappers; return a filtered copy
      var data = itemWindow._data.slice();
      // If category is specific, filter by type
      if (category === 'weapon') {
        return data.filter(function(o){ return DataManager.isWeapon(o) || (o && o.item && DataManager.isWeapon(o.item)); });
      } else if (category === 'armor') {
        return data.filter(function(o){ return DataManager.isArmor(o) || (o && o.item && DataManager.isArmor(o.item)); });
      } else if (category === 'item') {
        // common items (exclude key items and weapons/armors)
        return data.filter(function(o){
          var obj = o && o.item ? o.item : o;
          return DataManager.isItem(obj) && obj.itypeId === 1; // itypeId 1 = regular items
        });
      } else if (category === 'keyItem') {
        return data.filter(function(o){
          var obj = o && o.item ? o.item : o;
          return DataManager.isItem(obj) && obj.itypeId === 2; // itypeId 2 = key items
        });
      }
      return data;
    }

    // Wrap helper: safely replace a getter on prototype or instance
    function wrapGetter(targetObj, getterName, category, fallbackFn) {
      if (!targetObj || !targetObj[getterName]) return;
      if (targetObj[getterName]._ph_sceneitem_wrapped) return;
      var orig = targetObj[getterName];
      targetObj[getterName] = function() {
        try {
          var sceneData = sceneItemDataForCategory(category);
          if (sceneData && sceneData.length > 0) {
            // Normalize wrappers: if entries are wrapper objects with .item, return the DB object
            var normalized = sceneData.map(function(e){
              if (!e) return null;
              if (e.item) return e.item;
              return e;
            }).filter(function(x){ return !!x; });
            return normalized;
          }
        } catch (e) {
          // ignore and fall back
          console.error(PLUGIN + ': sceneData retrieval error', e);
        }
        // fallback to original behavior
        return orig.call(this);
      };
      targetObj[getterName]._ph_sceneitem_wrapped = true;
    }

    // Install wrappers on prototype (preferred) and instance (defensive)
    wrapGetter(proto, 'getCommonItems', 'item');
    wrapGetter(proto, 'getWeapons', 'weapon');
    wrapGetter(proto, 'getArmors', 'armor');
    wrapGetter(proto, 'getKeyItems', 'keyItem');

    // Also wrap on instance in case methods are instance-bound
    wrapGetter(mgr, 'getCommonItems', 'item');
    wrapGetter(mgr, 'getWeapons', 'weapon');
    wrapGetter(mgr, 'getArmors', 'armor');
    wrapGetter(mgr, 'getKeyItems', 'keyItem');

    console.log(PLUGIN + ': installed. When depositing in Scene_Item, getters use Scene_Item window data.');
  });

})();

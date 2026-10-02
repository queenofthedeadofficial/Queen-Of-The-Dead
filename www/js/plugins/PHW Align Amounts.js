/*:
 * @plugindesc PH Warehouse Align Amounts — keep displayed quantities aligned with meta-filtered list (UI-only)
 * @author Patch
 * @help
 * - Enable after PH_Warehouse.
 * - Non-destructive: only adjusts display arrays on the warehouse item window.
 */

(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_AlignAmounts';

  function isWarehouseScene(){
    var s = SceneManager._scene;
    return !!(s && s.constructor && String(s.constructor.name).toLowerCase().indexOf('warehouse') > -1);
  }

  // Resolve candidate to DB id
  function resolveId(entry){
    if(!entry) return null;
    var cand = entry && (entry.item || entry.object || entry._item) || entry;
    if(!cand) return null;
    return cand.id || cand.itemId || cand._id || null;
  }

  // Try to read canonical qty from PH warehouse object
  function qtyFromPH(id){
    try {
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(!ph) return null;
      var wh = ph._warehouses && ph._warehouses[ph._lastActive];
      if(!wh) return null;
      var cat = ph._lastCategory || 'item';
      // qtty often stored as wh.qtty[category] = { id: qty, ... }
      if(wh.qtty){
        var q = wh.qtty[cat] || wh.qtty;
        if(q && typeof q === 'object' && q[id] !== undefined) return q[id] || 0;
      }
      // wh.items may be map/array shapes; try common shapes
      if(wh.items){
        // if items is object with arrays per category
        if(wh.items[cat] && Array.isArray(wh.items[cat])){
          // if wh.items[cat] is array of ids, try to find index and look for qtty parallel array
          var arr = wh.items[cat];
          var idx = arr.indexOf(id);
          if(idx > -1){
            // try wh.qtty as array parallel to items
            if(Array.isArray(wh.qtty) && wh.qtty[idx] !== undefined) return wh.qtty[idx] || 0;
            // try wh.qtty[cat] as array
            if(wh.qtty && Array.isArray(wh.qtty[cat]) && wh.qtty[cat][idx] !== undefined) return wh.qtty[cat][idx] || 0;
          }
        }
        // if items is object mapping slot->id or id->slot, try to find qty by id key
        if(typeof wh.items === 'object'){
          // if wh.qtty is object keyed by id, handled above; else try wh.items values
          var keys = Object.keys(wh.items);
          for(var k=0;k<keys.length;k++){
            var v = wh.items[keys[k]];
            if(Array.isArray(v)){
              for(var j=0;j<v.length;j++){
                var val = v[j];
                if(val === id && wh.qtty && wh.qtty[keys[k]] && wh.qtty[keys[k]][j] !== undefined) return wh.qtty[keys[k]][j] || 0;
              }
            } else if(typeof v === 'number' && v === id){
              if(wh.qtty && wh.qtty[keys[k]] !== undefined) return wh.qtty[keys[k]] || 0;
            } else if(typeof v === 'object' && v.id && v.id === id && (v.qty || v.amount || v.count) !== undefined){
              return v.qty || v.amount || v.count || 0;
            }
          }
        }
      }
    } catch(e){}
    return null;
  }

  // Fallback: party inventory count
  function qtyFromParty(id){
    try {
      if($gameParty && typeof $gameParty.numItems === 'function'){
        var db = ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]);
        if(db) return $gameParty.numItems(db);
      }
    } catch(e){}
    return 0;
  }

  // Build amounts array aligned with this._data
  function buildAlignedAmounts(win){
    try {
      if(!win || !Array.isArray(win._data)) return;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      var amounts = [];
      for(var i=0;i<win._data.length;i++){
        var entry = win._data[i];
        var id = resolveId(entry);
        var qty = null;
        if(id != null) qty = qtyFromPH(id);
        if(qty === null) qty = qtyFromParty(id);
        amounts.push(qty);
      }
      // prefer common property names used by windows
      if(Array.isArray(win._amounts)) win._amounts = amounts;
      else if(Array.isArray(win._itemAmounts)) win._itemAmounts = amounts;
      else win._amounts = amounts;
    } catch(e){
      // ignore
    }
  }

  // Patch prototype methods for the live constructor
  function patchConstructor(win){
    try {
      if(!win || !win.constructor || !win.constructor.prototype) return;
      var C = win.constructor;
      if(C.prototype._ph_align_amounts_patched) return;
      // Wrap makeItemList
      if(typeof C.prototype.makeItemList === 'function' && !C.prototype._ph_make_wrapped){
        var orig = C.prototype.makeItemList;
        C.prototype._ph_make_wrapped = orig;
        C.prototype.makeItemList = function(){
          var res = orig.apply(this, arguments);
          try { if(isWarehouseScene()) buildAlignedAmounts(this); } catch(e){}
          return res;
        };
      }
      // Wrap setData (some windows call setData directly)
      if(typeof C.prototype.setData === 'function' && !C.prototype._ph_set_wrapped){
        var orig2 = C.prototype.setData;
        C.prototype._ph_set_wrapped = orig2;
        C.prototype.setData = function(){
          var res = orig2.apply(this, arguments);
          try { if(isWarehouseScene()) buildAlignedAmounts(this); } catch(e){}
          return res;
        };
      }
      // Wrap refresh to ensure amounts are rebuilt before drawing
      if(typeof C.prototype.refresh === 'function' && !C.prototype._ph_refresh_wrapped){
        var orig3 = C.prototype.refresh;
        C.prototype._ph_refresh_wrapped = orig3;
        C.prototype.refresh = function(){
          try { if(isWarehouseScene()) buildAlignedAmounts(this); } catch(e){}
          return orig3.apply(this, arguments);
        };
      }
      C.prototype._ph_align_amounts_patched = true;
      // Instance-level immediate alignment
      try { buildAlignedAmounts(win); if(typeof win.refresh === 'function') win.refresh(); } catch(e){}
    } catch(e){}
  }

  // Installer: attempt to patch live window constructor repeatedly
  (function installer(){
    var tries = 0;
    var max = 80;
    var id = setInterval(function(){
      tries++;
      try {
        var s = SceneManager._scene;
        if(s && s._itemWindow) patchConstructor(s._itemWindow);
      } catch(e){}
      if(tries >= max) clearInterval(id);
      var s2 = SceneManager._scene;
      if(s2 && s2._itemWindow && s2._itemWindow.constructor && s2._itemWindow.constructor._ph_align_amounts_patched) clearInterval(id);
    }, 150);
  })();

  // Public API for debugging
  window.PH_Warehouse_AlignAmounts = window.PH_Warehouse_AlignAmounts || {};
  window.PH_Warehouse_AlignAmounts.realignNow = function(){
    try {
      var s = SceneManager._scene;
      if(s && s._itemWindow) { buildAlignedAmounts(s._itemWindow); if(typeof s._itemWindow.refresh === 'function') s._itemWindow.refresh(); console.log(PLUGIN + ': realigned amounts now'); }
    } catch(e){ console.warn(PLUGIN + ': realignNow failed', e); }
  };

  console.log(PLUGIN + ': installed (UI-only amounts alignment).');
})();

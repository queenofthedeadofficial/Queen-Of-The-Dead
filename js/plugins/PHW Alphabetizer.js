/*:
 * @plugindesc Alphabetize PH Warehouse item lists (safe, non-destructive). Load after PH and PH MetaRules plugins.
 * @author Copilot
 * @help
 * Sorts the Window_WarehouseItemList._data after it's built (underscores treated as spaces).
 * Non-destructive: only changes UI ordering in memory. Call PHW_Alphabetizer_restore() to undo.
 */

(function(){
  'use strict';
  var PL = 'PHW_Alphabetizer_Fix';

  function resolveCandidate(entry){ return entry && (entry.item || entry.object || entry._item) || entry; }
  function nameKey(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || '').toString().trim();
      raw = raw.replace(/_/g,' ').replace(/^[\s"'\u201C\u201D]+|[\s"'\u201C\u201D]+$/g,'');
      if(!raw && (obj.id||obj.itemId||obj._id)) raw = String(obj.id||obj.itemId||obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }

  function installPatch(proto){
    if(!proto || proto.__phw_alpha_installed) return false;
    proto.__phw_alpha_backup = proto.__phw_alpha_backup || { makeItemList: proto.makeItemList, setData: proto.setData, refresh: proto.refresh };

    proto.makeItemList = function(){
      // call original to populate _data
      var res = proto.__phw_alpha_backup.makeItemList.apply(this, arguments);
      try {
        if(Array.isArray(this._data) && this._data.length > 1){
          this._data = this._data.slice().sort(function(a,b){
            var A = resolveCandidate(a), B = resolveCandidate(b);
            var na = nameKey(A), nb = nameKey(B);
            if(na === nb) return 0;
            return na.localeCompare(nb);
          });
        }
      } catch(e){
        if(typeof console !== 'undefined' && console.warn) console.warn(PL+': sort failed', e);
      }
      try { if(this.refresh) this.refresh(); } catch(e){}
      return res;
    };

    // also patch setData so external callers that set _data directly get sorted
    proto.setData = function(arr){
      var res = proto.__phw_alpha_backup.setData ? proto.__phw_alpha_backup.setData.apply(this, arguments) : (this._data = arr);
      try {
        if(Array.isArray(this._data) && this._data.length > 1){
          this._data = this._data.slice().sort(function(a,b){
            var A = resolveCandidate(a), B = resolveCandidate(b);
            var na = nameKey(A), nb = nameKey(B);
            if(na === nb) return 0;
            return na.localeCompare(nb);
          });
        }
      } catch(e){ if(typeof console !== 'undefined' && console.warn) console.warn(PL+': setData sort failed', e); }
      try { if(this.refresh) this.refresh(); } catch(e){}
      return res;
    };

    proto.__phw_alpha_installed = true;
    return true;
  }

  // Robust installer: wait for PH and the final prototype, reapply if replaced
  function startInstaller(){
    var attempts = 0;
    var maxAttempts = 400; // ~60s
    var interval = 150;
    var applied = false;
    var watcher = setInterval(function(){
      attempts++;
      var proto = window.Window_WarehouseItemList && window.Window_WarehouseItemList.prototype;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(proto && ph){
        if(!proto.__phw_alpha_installed){
          if(installPatch(proto)){ applied = true; console.log(PL+': prototype patched'); }
        } else {
          applied = true;
        }
      }
      if(attempts >= maxAttempts){
        clearInterval(watcher);
        if(!applied) console.warn(PL+': finished watching; patch may not have applied. Ensure plugin is loaded after PH and MetaRules.');
        else console.log(PL+': finished watching; patch active.');
      }
    }, interval);

    // short reapply watcher in case another plugin replaces prototype shortly after
    var reapply = setInterval(function(){
      var proto = window.Window_WarehouseItemList && window.Window_WarehouseItemList.prototype;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(proto && ph && !proto.__phw_alpha_installed){
        if(installPatch(proto)) console.log(PL+': re-applied patch after replacement');
      }
    }, 300);
    setTimeout(function(){ clearInterval(reapply); }, 120000);
  }

  // Alphabetize PH._warehouses keys in memory (session only)
  function alphabetizeWarehousesInMemory(){
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    if(!ph || !ph._warehouses) return;
    if(!ph.__phw_warehouses_backup) ph.__phw_warehouses_backup = ph._warehouses;
    var keys = Object.keys(ph._warehouses||{});
    keys.sort(function(a,b){
      var A = (ph._warehouses[a] && (ph._warehouses[a].name||a) || a).toString().toUpperCase();
      var B = (ph._warehouses[b] && (ph._warehouses[b].name||b) || b).toString().toUpperCase();
      return A.localeCompare(B);
    });
    var newObj = {};
    keys.forEach(function(k){ newObj[k] = ph._warehouses[k]; });
    ph._warehouses = newObj;
    ph.__phw_sorted_keys = keys;
    console.log(PL+': PH._warehouses reordered in memory (session only).');
  }

  // Start installer and try alphabetizing now
  startInstaller();
  try { alphabetizeWarehousesInMemory(); } catch(e){}

  // Restore function
  window.PHW_Alphabetizer_restore = function(){
    var proto = window.Window_WarehouseItemList && window.Window_WarehouseItemList.prototype;
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    if(proto && proto.__phw_alpha_backup){
      var b = proto.__phw_alpha_backup;
      if(b.makeItemList) proto.makeItemList = b.makeItemList;
      if(b.setData) proto.setData = b.setData;
      if(b.refresh) proto.refresh = b.refresh;
      delete proto.__phw_alpha_backup;
      delete proto.__phw_alpha_installed;
    }
    if(ph && ph.__phw_warehouses_backup) ph._warehouses = ph.__phw_warehouses_backup;
    if(ph) { delete ph.__phw_warehouses_backup; delete ph.__phw_sorted_keys; }
    console.log(PL+': restored original state. Refresh windows if needed.');
  };

})();

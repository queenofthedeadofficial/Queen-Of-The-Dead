/*:
 * @plugindesc PH Warehouse: robust partition+alphabetize + hide invalid rows (works with PH meta-rules) — reversible
 * @author Patch (patched)
 * @help
 * - Place after PH_Warehouse and any PH meta-rules plugins.
 * - Uses PH.verifyItem(entry) as primary validity check (falls back to DB object).
 * - Partitions valid items to the top, alphabetizes valid group, hides invalid rows, and skips them in navigation.
 * - Recomputes after PH.populate / PH.load so it runs last.
 * - API:
 *    PH_Warehouse_RobustPartitionHide.setDebug(true|false)
 *    PH_Warehouse_RobustPartitionHide.reapplyNow()
 *    PH_Warehouse_RobustPartitionHide.restoreOriginal()
 */

(function(){
  'use strict';
  var PL = 'PH_Warehouse_RobustPartitionHide';
  var DEBUG = false;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }

  // Helpers
  function resolveCandidate(entry){ return entry && (entry.item || entry.object || entry._item) || entry; }
  function resolveDB(entry){
    var cand = resolveCandidate(entry);
    if(!cand) return null;
    var id = cand.id || cand.itemId || cand._id;
    if(id != null) return ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]) || cand;
    return cand;
  }
  function normalizeNameForSort(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || obj.description || '').toString().trim();
      raw = raw.replace(/^[\s"'\u201C\u201D]+|[\s"'\u201C\u201D]+$/g, '');
      if(!raw && (obj.id || obj.itemId || obj._id)) raw = String(obj.id || obj.itemId || obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }

  // Robust validity check: try entry, then DB, then entry+context
  function phIsValid(entry, win){
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    if(!ph || typeof ph.verifyItem !== 'function') return false;
    try {
      if(ph.verifyItem(entry)) return true;
    } catch(e){}
    try {
      var db = resolveDB(entry);
      if(db && ph.verifyItem(db)) return true;
    } catch(e){}
    try {
      if(win && ph.verifyItem(entry, win)) return true;
    } catch(e){}
    return false;
  }

  // Partition valid-first and sort valid group by normalized name (stable)
  function partitionAndSortByEntry(arr){
    if(!Array.isArray(arr) || arr.length < 2) return arr;
    var valid = [], invalid = [];
    for(var i=0;i<arr.length;i++){
      var entry = arr[i];
      try {
        if(phIsValid(entry)) valid.push(entry);
        else invalid.push(entry);
      } catch(e){
        invalid.push(entry);
      }
    }
    valid.sort(function(a,b){
      var na = normalizeNameForSort(resolveDB(a) || resolveCandidate(a));
      var nb = normalizeNameForSort(resolveDB(b) || resolveCandidate(b));
      if(na === nb) return ((a.id||a.itemId||a._id||0) - (b.id||b.itemId||b._id||0));
      return na.localeCompare(nb);
    });
    return valid.concat(invalid);
  }

  // Compute mask deterministically using phIsValid(entry, win)
  function computeMaskFor(win){
    try {
      var arr = win._data || [];
      win._ph_validMask = new Array(arr.length);
      win._ph_validCount = 0;
      for(var i=0;i<arr.length;i++){
        var entry = arr[i];
        var ok = false;
        try { ok = !!phIsValid(entry, win); } catch(e){ ok = false; }
        win._ph_validMask[i] = !!ok;
        if(ok) win._ph_validCount++;
      }
      log(PL + ': mask computed valid=' + (win._ph_validCount||0) + '/' + arr.length);
    } catch(e){
      win._ph_validMask = [];
      win._ph_validCount = 0;
      console.warn(PL + ': computeMaskFor failed', e);
    }
  }
  function clearMaskFor(win){ try { delete win._ph_validMask; delete win._ph_validCount; } catch(e){} }

  // Navigation helpers: patch instance to skip invalid rows
  function patchInstanceNav(win){
    if(!win || win._ph_nav_hidden) return;
    win._ph_nav_backup = win._ph_nav_backup || {
      select: win.select,
      cursorDown: win.cursorDown,
      cursorUp: win.cursorUp,
      isOkEnabled: win.isOkEnabled
    };
    function isValidEntry(entry){ try { return !!phIsValid(entry, win); } catch(e){ return false; } }
    function findNextValid(win, start, dir){
      var i = start;
      var len = (win._data && win._data.length) || 0;
      while(true){
        i += dir;
        if(i < 0 || i >= len) return -1;
        if(isValidEntry(win._data[i])) return i;
      }
    }
    win.select = function(index){
      if(typeof index !== 'number') return;
      if(isValidEntry(this._data[index])){
        if(typeof win._ph_nav_backup.select === 'function') win._ph_nav_backup.select.call(this, index);
        else this._index = index;
        return;
      }
      var down = (function(){ for(var k=index-1;k>=0;k--) if(isValidEntry(this._data[k])) return k; return -1; }).call(this);
      var up = (function(){ for(var k=index+1;k<this._data.length;k++) if(isValidEntry(this._data[k])) return k; return -1; }).call(this);
      var choose = down !== -1 ? down : up;
      if(choose !== -1){
        if(typeof win._ph_nav_backup.select === 'function') win._ph_nav_backup.select.call(this, choose);
        else this._index = choose;
      }
    };
    win.cursorDown = function(){
      var cur = (typeof this.index === 'function') ? this.index() : (this._index || 0);
      var next = findNextValid(this, cur, +1);
      if(next >= 0){
        if(typeof win._ph_nav_backup.select === 'function') win._ph_nav_backup.select.call(this, next);
        else this._index = next;
      }
    };
    win.cursorUp = function(){
      var cur = (typeof this.index === 'function') ? this.index() : (this._index || 0);
      var next = findNextValid(this, cur, -1);
      if(next >= 0){
        if(typeof win._ph_nav_backup.select === 'function') win._ph_nav_backup.select.call(this, next);
        else this._index = next;
      }
    };
    win.isOkEnabled = function(){
      var idx = (typeof this.index === 'function') ? this.index() : (this._index || 0);
      return !!(this._data && this._data[idx] && (function(entry){ try { return !!phIsValid(entry, win); } catch(e){ return false; } })(this._data[idx]));
    };
    win._ph_nav_hidden = true;
  }

  // Patch constructor: makeItemList, setData, refresh, drawItem, item, close
  function installOnConstructor(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return false;
      var inst = s._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'; });
      var C = (inst && inst.constructor) || (typeof Window_WarehouseItemList !== 'undefined' && Window_WarehouseItemList) || null;
      if(!C || !C.prototype) return false;
      if(C._ph_rph_installed) return true;

      // backup originals
      C._ph_rph_backup = C._ph_rph_backup || {
        makeItemList: C.prototype.makeItemList,
        setData: C.prototype.setData,
        refresh: C.prototype.refresh,
        close: C.prototype.close,
        drawItem: C.prototype.drawItem,
        item: C.prototype.item,
        maxItems: C.prototype.maxItems
      };

      // makeItemList: original then partition+mask
      C.prototype.makeItemList = function(){
        try { C._ph_rph_backup.makeItemList.apply(this, arguments); } catch(e){}
        try { if(Array.isArray(this._data)) this._data = partitionAndSortByEntry(this._data); } catch(e){}
        try { computeMaskFor(this); } catch(e){}
      };

      // setData: partition incoming array then call original, then compute mask
      C.prototype.setData = function(){
        try { if(arguments && arguments.length>0 && Array.isArray(arguments[0])) arguments[0] = partitionAndSortByEntry(arguments[0]); } catch(e){}
        var res;
        try { res = C._ph_rph_backup.setData.apply(this, arguments); } catch(e){ res = undefined; }
        try { computeMaskFor(this); } catch(e){}
        return res;
      };

      // refresh: ensure mask exists then call original
      C.prototype.refresh = function(){
        try { if(!this._ph_validMask && Array.isArray(this._data)) computeMaskFor(this); } catch(e){}
        try { return C._ph_rph_backup.refresh.apply(this, arguments); } catch(e){}
      };

      // close: clear mask then original
      C.prototype.close = function(){
        try { clearMaskFor(this); } catch(e){}
        try { return C._ph_rph_backup.close.apply(this, arguments); } catch(e){}
      };

      // drawItem: skip drawing invalid rows if mask present
      C.prototype.drawItem = function(index){
        try {
          var entry = (this._data||[])[index];
          if(!entry) return;
          if(this._ph_validMask){
            if(!this._ph_validMask[index]) return;
          } else {
            if(!phIsValid(entry, this)) return;
          }
        } catch(e){}
        return C._ph_rph_backup.drawItem.apply(this, arguments);
      };

      // item: return null for invalid rows
      C.prototype.item = function(index){
        try {
          var entry = (this._data||[])[index];
          if(!entry) return null;
          if(this._ph_validMask){
            if(!this._ph_validMask[index]) return null;
          } else {
            if(!phIsValid(entry, this)) return null;
          }
        } catch(e){ return null; }
        return C._ph_rph_backup.item.apply(this, arguments);
      };

      // maxItems: reflect filtered _data length defensively
      C.prototype.maxItems = function(){
        try { if(Array.isArray(this._data)) return this._data.length; } catch(e){}
        return C._ph_rph_backup.maxItems.apply(this, arguments);
      };

      C._ph_rph_installed = true;
      log(PL + ': installed on constructor', (C.name || '(anonymous)'));

      // patch existing instances now
      try {
        var s2 = SceneManager._scene;
        if(s2 && s2._windowLayer && Array.isArray(s2._windowLayer.children)){
          s2._windowLayer.children.forEach(function(c){
            try {
              if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){
                computeMaskFor(c);
                patchInstanceNav(c);
                if(typeof c.refresh === 'function') c.refresh();
              }
            } catch(e){}
          });
        }
      } catch(e){}

      return true;
    } catch(e){
      console.warn(PL + ': installOnConstructor error', e);
      return false;
    }
  }

  // Ensure we run after PH.populate/load (wrap them if present)
  function wrapPHPopulateLoad(){
    try {
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(!ph) return;
      if(typeof ph.populate === 'function' && !ph._rph_pop_wrapped){
        ph._rph_pop_wrapped = ph.populate;
        ph.populate = function(){
          var res = ph._rph_pop_wrapped.apply(this, arguments);
          try {
            // reapply partition+mask to any windows
            var s = SceneManager._scene;
            if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
              s._windowLayer.children.forEach(function(c){
                try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){ if(Array.isArray(c._data)) c._data = partitionAndSortByEntry(c._data); computeMaskFor(c); if(typeof c.refresh === 'function') c.refresh(); } } catch(e){}
              });
            }
          } catch(e){}
          return res;
        };
        log(PL + ': wrapped PH.populate');
      }
      if(typeof ph.load === 'function' && !ph._rph_load_wrapped){
        ph._rph_load_wrapped = ph.load;
        ph.load = function(){
          var res = ph._rph_load_wrapped.apply(this, arguments);
          try {
            var s = SceneManager._scene;
            if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
              s._windowLayer.children.forEach(function(c){
                try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){ if(Array.isArray(c._data)) c._data = partitionAndSortByEntry(c._data); computeMaskFor(c); if(typeof c.refresh === 'function') c.refresh(); } } catch(e){}
              });
            }
          } catch(e){}
          return res;
        };
        log(PL + ': wrapped PH.load');
      }
    } catch(e){ console.warn(PL + ': wrapPHPopulateLoad error', e); }
  }

  // Clear masks on scene terminate (generic)
  function installSceneTerminateClear(){
    try {
      var SceneProto = (SceneManager._scene && SceneManager._scene.constructor && SceneManager._scene.constructor.prototype) || null;
      if(!SceneProto || SceneProto._ph_rph_scene_patched) return;
      SceneProto._ph_rph_scene_patched = true;
      SceneProto._ph_rph_orig_terminate = SceneProto.terminate;
      SceneProto.terminate = function(){
        try {
          var layer = this._windowLayer;
          if(layer && Array.isArray(layer.children)){
            layer.children.forEach(function(c){
              try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList') clearMaskFor(c); } catch(e){}
            });
          }
        } catch(e){}
        return SceneProto._ph_rph_orig_terminate.apply(this, arguments);
      };
      log(PL + ': scene terminate hook installed');
    } catch(e){}
  }

  // Installer: try to install now and retry until success
  (function installer(){
    var tries = 0, max = 240;
    var id = setInterval(function(){
      tries++;
      try {
        if(installOnConstructor()){
          wrapPHPopulateLoad();
          installSceneTerminateClear();
          clearInterval(id);
        }
      } catch(e){ log(e); }
      if(tries >= max) clearInterval(id);
    }, 120);
  })();

  /* Public API */
  window.PH_Warehouse_RobustPartitionHide = window.PH_Warehouse_RobustPartitionHide || {};
  window.PH_Warehouse_RobustPartitionHide.setDebug = function(v){ DEBUG = !!v; console.log(PL + ': DEBUG =', DEBUG); };
  window.PH_Warehouse_RobustPartitionHide.reapplyNow = function(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PL + ': no active scene');
      s._windowLayer.children.forEach(function(c){
        try {
          if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){
            if(Array.isArray(c._data)) c._data = partitionAndSortByEntry(c._data);
            computeMaskFor(c);
            patchInstanceNav(c);
            if(typeof c.refresh === 'function') c.refresh();
          }
        } catch(e){}
      });
      console.log(PL + ': reapplyNow executed.');
    } catch(e){ console.warn(PL + ': reapplyNow error', e); }
  };
  window.PH_Warehouse_RobustPartitionHide.restoreOriginal = function(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PL + ': no active scene');
      var inst = s._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'; });
      if(!inst) return console.log(PL + ': no instance found to restore from');
      var C = inst.constructor;
      if(C && C._ph_rph_backup){
        var b = C._ph_rph_backup;
        if(b.makeItemList) C.prototype.makeItemList = b.makeItemList;
        if(b.setData) C.prototype.setData = b.setData;
        if(b.refresh) C.prototype.refresh = b.refresh;
        if(b.close) C.prototype.close = b.close;
        if(b.drawItem) C.prototype.drawItem = b.drawItem;
        if(b.item) C.prototype.item = b.item;
        if(b.maxItems) C.prototype.maxItems = b.maxItems;
        delete C._ph_rph_backup;
        delete C._ph_rph_installed;
        console.log(PL + ': restored prototype methods. Reload scene to fully restore instances.');
      } else console.log(PL + ': no prototype backup found.');
      // restore PH.populate/load if wrapped
      try {
        var ph = window.PHPlugins && PHPlugins.PHWarehouse;
        if(ph){
          if(ph._rph_pop_wrapped) ph.populate = ph._rph_pop_wrapped, delete ph._rph_pop_wrapped;
          if(ph._rph_load_wrapped) ph.load = ph._rph_load_wrapped, delete ph._rph_load_wrapped;
        }
      } catch(e){}
      // clear masks on instances
      try {
        s._windowLayer.children.forEach(function(c){ try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList') clearMaskFor(c); } catch(e){} });
      } catch(e){}
    } catch(e){ console.warn(PL + ': restoreOriginal error', e); }
  };

  log(PL + ': installer started.');
})();

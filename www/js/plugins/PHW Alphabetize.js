/*:
 * @plugindesc Alphabetize + Partition PH Warehouse Lists and hide invalid rows (prototype-level, reversible)
 * @author Patch (patched)
 * @help
 * - Place after PH_Warehouse and any PH meta-rules plugins.
 * - Partitions items so PH.verifyItem() matches appear first (alphabetized), non-matching items follow.
 * - Computes a per-window validity mask when the window builds or receives data.
 * - Hides invalid rows (skips drawing and selection) and clears the mask on close/scene terminate.
 * - API:
 *    PH_Warehouse_AlphaSort_PartitionHide.setDebug(true|false)
 *    PH_Warehouse_AlphaSort_PartitionHide.reapplyNow()
 *    PH_Warehouse_AlphaSort_PartitionHide.restoreOriginal()
 */

(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_AlphaSort_PartitionHide';
  var DEBUG = false;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }

  /* -------------------------
     Utilities: name sort + resolve DB
     ------------------------- */
  function normalizeNameForSort(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || obj.description || '').toString().trim();
      raw = raw.replace(/^[\s"'\u201C\u201D]+|[\s"'\u201C\u201D]+$/g, '');
      if(!raw && (obj.id || obj.itemId || obj._id)) raw = String(obj.id || obj.itemId || obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }

  function sortByNameArray(arr){
    if(!Array.isArray(arr) || arr.length < 2) return arr;
    try {
      return arr.sort(function(a,b){
        var na = normalizeNameForSort(a);
        var nb = normalizeNameForSort(b);
        if(na === nb){
          var ida = a.id || a.itemId || a._id || 0;
          var idb = b.id || b.itemId || b._id || 0;
          return ida - idb;
        }
        return na.localeCompare(nb);
      });
    } catch(e){ return arr; }
  }

  function resolveCandidate(entry){ return entry && (entry.item || entry.object || entry._item) || entry; }
  function resolveDB(entry){
    var cand = resolveCandidate(entry);
    if(!cand) return null;
    var id = cand.id || cand.itemId || cand._id;
    if(id != null) return ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]) || cand;
    return cand;
  }

  /* -------------------------
     Partition + sort: valid first, alphabetize valid
     ------------------------- */
  function partitionAndSort(arr){
    if(!Array.isArray(arr) || arr.length < 2) return arr;
    try {
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      var valid = [], invalid = [];
      for(var i=0;i<arr.length;i++){
        var entry = arr[i];
        try {
          var db = resolveDB(entry) || entry;
          var ok = ph && typeof ph.verifyItem === 'function' ? !!ph.verifyItem(db) : true;
          if(ok) valid.push(entry); else invalid.push(entry);
        } catch(e){
          invalid.push(entry);
        }
      }
      try { valid = sortByNameArray(valid); } catch(e){}
      return valid.concat(invalid);
    } catch(e){
      return arr;
    }
  }

  /* -------------------------
     Mask lifecycle + hide/skip behavior installer
     ------------------------- */
  function computeMaskFor(win){
    try {
      var p = window.PHPlugins && PHPlugins.PHWarehouse;
      var arr = win._data || [];
      win._ph_validMask = new Array(arr.length);
      win._ph_validCount = 0;
      for(var i=0;i<arr.length;i++){
        try {
          var db = resolveDB(arr[i]) || arr[i];
          var ok = p && typeof p.verifyItem === 'function' ? !!p.verifyItem(db) : true;
          win._ph_validMask[i] = !!ok;
          if(ok) win._ph_validCount++;
        } catch(e){
          win._ph_validMask[i] = false;
        }
      }
      log(PLUGIN + ': computed mask (valid=' + (win._ph_validCount||0) + '/' + arr.length + ')');
    } catch(e){
      win._ph_validMask = [];
      win._ph_validCount = 0;
    }
  }
  function clearMaskFor(win){
    try { delete win._ph_validMask; delete win._ph_validCount; } catch(e){}
  }

  // Install on the constructor used by the live instance (robust to load order)
  function installOnConstructor(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return false;
      var inst = s._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'; });
      var C = (inst && inst.constructor) || (typeof Window_WarehouseItemList !== 'undefined' && Window_WarehouseItemList) || null;
      if(!C || !C.prototype) return false;
      if(C._ph_partition_hide_installed) return true;

      // backup originals
      C._ph_partition_hide_backup = C._ph_partition_hide_backup || {
        makeItemList: C.prototype.makeItemList,
        setData: C.prototype.setData,
        refresh: C.prototype.refresh,
        close: C.prototype.close,
        drawItem: C.prototype.drawItem,
        item: C.prototype.item,
        maxItems: C.prototype.maxItems
      };

      // wrap makeItemList: original then partition+compute mask
      C.prototype.makeItemList = function(){
        try { C._ph_partition_hide_backup.makeItemList.apply(this, arguments); } catch(e){}
        try { if(Array.isArray(this._data)) this._data = partitionAndSort(this._data); } catch(e){}
        try { computeMaskFor(this); } catch(e){}
      };

      // wrap setData: partition incoming array then compute mask after set
      C.prototype.setData = function(){
        try {
          if(arguments && arguments.length>0 && Array.isArray(arguments[0])){
            arguments[0] = partitionAndSort(arguments[0]);
          }
        } catch(e){}
        var res;
        try { res = C._ph_partition_hide_backup.setData.apply(this, arguments); } catch(e){ res = undefined; }
        try { computeMaskFor(this); } catch(e){}
        return res;
      };

      // wrap refresh: ensure mask exists and partition if needed
      C.prototype.refresh = function(){
        try { if(!this._ph_validMask && Array.isArray(this._data)) computeMaskFor(this); } catch(e){}
        try { return C._ph_partition_hide_backup.refresh.apply(this, arguments); } catch(e){}
      };

      // wrap close: clear mask then original
      C.prototype.close = function(){
        try { clearMaskFor(this); } catch(e){}
        try { return C._ph_partition_hide_backup.close.apply(this, arguments); } catch(e){}
      };

      // drawItem: skip drawing invalid rows if mask present
      C.prototype.drawItem = function(index){
        try {
          var entry = (this._data||[])[index];
          if(!entry) return;
          if(this._ph_validMask){
            if(!this._ph_validMask[index]) return;
          } else {
            var db = resolveDB(entry) || entry;
            var p = window.PHPlugins && PHPlugins.PHWarehouse;
            if(p && typeof p.verifyItem === 'function' && !p.verifyItem(db)) return;
          }
        } catch(e){}
        return C._ph_partition_hide_backup.drawItem.apply(this, arguments);
      };

      // item: return null for invalid rows
      C.prototype.item = function(index){
        try {
          var entry = (this._data||[])[index];
          if(!entry) return null;
          if(this._ph_validMask){
            if(!this._ph_validMask[index]) return null;
          } else {
            var db = resolveDB(entry) || entry;
            var p = window.PHPlugins && PHPlugins.PHWarehouse;
            if(p && typeof p.verifyItem === 'function' && !p.verifyItem(db)) return null;
          }
        } catch(e){ return null; }
        return C._ph_partition_hide_backup.item.apply(this, arguments);
      };

      // maxItems: reflect filtered _data length defensively
      C.prototype.maxItems = function(){
        try { if(Array.isArray(this._data)) return this._data.length; } catch(e){}
        return C._ph_partition_hide_backup.maxItems.apply(this, arguments);
      };

      C._ph_partition_hide_installed = true;
      log(PLUGIN + ': installed on constructor', (C.name || '(anonymous)'));

      // patch existing instances navigation so cursor skips invalid rows
      function patchInstanceNav(win){
        if(!win || win._ph_nav_hidden) return;
        win._ph_nav_backup = win._ph_nav_backup || {
          select: win.select,
          cursorDown: win.cursorDown,
          cursorUp: win.cursorUp,
          isOkEnabled: win.isOkEnabled
        };
        function isValidEntry(entry){
          try { var db = resolveDB(entry) || entry; var p = window.PHPlugins && PHPlugins.PHWarehouse; return p && typeof p.verifyItem === 'function' ? !!p.verifyItem(db) : true; } catch(e){ return false; }
        }
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
          return !!(this._data && this._data[idx] && (function(entry){ try { var db = resolveDB(entry)||entry; var p = window.PHPlugins && PHPlugins.PHWarehouse; return p && typeof p.verifyItem === 'function' ? !!p.verifyItem(db) : true; } catch(e){ return false; } })(this._data[idx]));
        };
        win._ph_nav_hidden = true;
      }

      try {
        var s2 = SceneManager._scene;
        if(s2 && s2._windowLayer && Array.isArray(s2._windowLayer.children)){
          s2._windowLayer.children.forEach(function(c){
            try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){ computeMaskFor(c); patchInstanceNav(c); if(typeof c.refresh === 'function') c.refresh(); } } catch(e){}
          });
        }
      } catch(e){}

      return true;
    } catch(e){
      log(PLUGIN + ': install error', e);
      return false;
    }
  }

  // installer: retry until constructor available
  (function installer(){
    var tries = 0, max = 240;
    var id = setInterval(function(){
      tries++;
      try {
        if(installOnConstructor()) clearInterval(id);
      } catch(e){ log(e); }
      if(tries >= max) clearInterval(id);
    }, 120);
  })();

  // clear masks on scene terminate (generic safe hook)
  (function installSceneTerminateClear(){
    try {
      var SceneProto = (SceneManager._scene && SceneManager._scene.constructor && SceneManager._scene.constructor.prototype) || null;
      if(!SceneProto || SceneProto._ph_partition_scene_patched) return;
      SceneProto._ph_partition_scene_patched = true;
      SceneProto._ph_partition_orig_terminate = SceneProto.terminate;
      SceneProto.terminate = function(){
        try {
          var layer = this._windowLayer;
          if(layer && Array.isArray(layer.children)){
            layer.children.forEach(function(c){
              try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList') clearMaskFor(c); } catch(e){}
            });
          }
        } catch(e){}
        return SceneProto._ph_partition_orig_terminate.apply(this, arguments);
      };
      log(PLUGIN + ': scene terminate hook installed');
    } catch(e){}
  })();

  /* -------------------------
     Public API
     ------------------------- */
  window.PH_Warehouse_AlphaSort_PartitionHide = window.PH_Warehouse_AlphaSort_PartitionHide || {};
  window.PH_Warehouse_AlphaSort_PartitionHide.setDebug = function(v){ DEBUG = !!v; console.log(PLUGIN + ': DEBUG =', DEBUG); };
  window.PH_Warehouse_AlphaSort_PartitionHide.reapplyNow = function(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PLUGIN + ': no active scene');
      s._windowLayer.children.forEach(function(c){
        try {
          if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){
            if(Array.isArray(c._data)) c._data = partitionAndSort(c._data);
            computeMaskFor(c);
            if(typeof c.refresh === 'function') c.refresh();
          }
        } catch(e){}
      });
      console.log(PLUGIN + ': reapplyNow executed.');
    } catch(e){ console.warn(PLUGIN + ': reapplyNow error', e); }
  };
  window.PH_Warehouse_AlphaSort_PartitionHide.restoreOriginal = function(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PLUGIN + ': no active scene');
      var inst = s._windowLayer.children.find(function(c){ return c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'; });
      if(!inst) return console.log(PLUGIN + ': no instance found to restore from');
      var C = inst.constructor;
      if(C && C._ph_partition_hide_backup){
        var b = C._ph_partition_hide_backup;
        if(b.makeItemList) C.prototype.makeItemList = b.makeItemList;
        if(b.setData) C.prototype.setData = b.setData;
        if(b.refresh) C.prototype.refresh = b.refresh;
        if(b.close) C.prototype.close = b.close;
        if(b.drawItem) C.prototype.drawItem = b.drawItem;
        if(b.item) C.prototype.item = b.item;
        if(b.maxItems) C.prototype.maxItems = b.maxItems;
        delete C._ph_partition_hide_backup;
        delete C._ph_partition_hide_installed;
        console.log(PLUGIN + ': restored prototype methods. Reload scene to fully restore instances.');
      } else console.log(PLUGIN + ': no prototype backup found.');
      // clear masks on instances
      try {
        s._windowLayer.children.forEach(function(c){ try { if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList') clearMaskFor(c); } catch(e){} });
      } catch(e){}
    } catch(e){ console.warn(PLUGIN + ': restoreOriginal error', e); }
  };

  log(PLUGIN + ': installer started.');
})();

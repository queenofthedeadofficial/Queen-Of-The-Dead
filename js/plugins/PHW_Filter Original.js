/*:
 * @plugindesc PH Warehouse Safe Auto Sorter — sorts display to match canonical source array and rebuilds UI. Load after PH plugins.
 * @author Copilot (patched)
 * @help
 * Reorders window._data to follow inst.items[category] (canonical source array),
 * updates the safe draw cache, and forces a refresh. Wraps loadItems so the
 * sort runs whenever the window repopulates. Non-destructive: backs up originals
 * and exposes PHW_SafeAuto_restore() to undo.
 */
(function(){
  'use strict';
  var PL = 'PHW_SafeAutoSorter';

  function resolveEntry(e){ return e && (e.item||e.object||e._item) || e; }
  function nameKey(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || '').toString().trim();
      raw = raw.replace(/_/g,' ').replace(/^[\s"\'\u201C\u201D]+|[\s"\'\u201C\u201D]+$/g,'');
      if(!raw && (obj.id||obj.itemId||obj._id)) raw = String(obj.id||obj.itemId||obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }

  function buildDisplayList(win){
    var data = Array.isArray(win._data) ? win._data : [];
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    var valid = [], invalid = [];
    for(var i=0;i<data.length;i++){
      var cand = resolveEntry(data[i]);
      var ok = false;
      try { if(ph && typeof ph.verifyItem === 'function') ok = !!ph.verifyItem(cand); } catch(e){ ok = false; }
      if(ok) valid.push(i); else invalid.push(i);
    }
    var cmp = function(ai,bi){
      var A = resolveEntry(data[ai]), B = resolveEntry(data[bi]);
      var na = nameKey(A), nb = nameKey(B);
      if(na === nb) return (ai - bi);
      return na.localeCompare(nb);
    };
    valid.sort(cmp);
    invalid.sort(cmp);
    return valid.concat(invalid);
  }

  // Align win._data order to canonical inst.items[category]
  function alignWindowDataToCanonical(win){
    try {
      if(!win || !win.constructor) return false;
      var name = String(win.constructor.name || '');
      if(name.indexOf('WarehouseItemList') === -1) return false;
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      if(!ph) return false;

      var active = (win._activeName || ph._lastActive);
      var category = (win._categoryName || ph._lastCategory);
      if(!active || !category) return false;

      var inst = ph._warehouses && ph._warehouses[active];
      if(!inst) return false;
      var canonical = Array.isArray(inst.items && inst.items[category]) ? inst.items[category].slice() : [];
      if(!Array.isArray(win._data) || canonical.length === 0) return false;

      // Build id -> data entry map for current win._data entries
      var idFor = function(entry){
        var cand = entry && (entry.item || entry.object || entry._item) || entry;
        return cand && (cand.id || cand.itemId || cand._id) ? String(cand.id || cand.itemId || cand._id) : null;
      };
      var dataById = {};
      win._data.forEach(function(d){
        var id = idFor(d);
        if(id) dataById[String(id)] = d;
      });

      // Rebuild _data in canonical order, falling back to any remaining entries
      var newData = [];
      canonical.forEach(function(k){
        var key = String(k);
        if(key in dataById){ newData.push(dataById[key]); delete dataById[key]; }
      });
      Object.keys(dataById).forEach(function(k){ newData.push(dataById[k]); });

      // Replace _data and update safe draw cache if present
      win._data = newData;
      if(win.__phw_safe_draw_cache && Array.isArray(win.__phw_safe_draw_cache.list)){
        win.__phw_safe_draw_cache.list = newData.map(function(_, idx){ return idx; });
        win.__phw_safe_draw_cache.ts = Date.now();
      }

      // If no safe cache present, create one so other code can rely on it
      if(!win.__phw_safe_draw_cache) win.__phw_safe_draw_cache = { list: newData.map(function(_, idx){ return idx; }), ts: Date.now(), ttl: 250 };

      return true;
    } catch(e){
      return false;
    }
  }

  function installSafeDraw(win){
    try {
      if(!win || !win.constructor) return false;
      var name = String(win.constructor.name || '');
      if(name.indexOf('WarehouseItemList') === -1) return false;
      if(win.__phw_safe_draw_installed) return false;

      // backup originals
      if(!win.__phw_safe_draw_orig) win.__phw_safe_draw_orig = {
        drawItem: win.drawItem,
        item: win.item,
        loadItems: win.loadItems
      };

      // cache
      win.__phw_safe_draw_cache = win.__phw_safe_draw_cache || { list: null, ts: 0, ttl: 250 };

      function getDataIndexForDisplay(w, displayIndex){
        var now = Date.now();
        if(!w.__phw_safe_draw_cache.list || (now - w.__phw_safe_draw_cache.ts) > w.__phw_safe_draw_cache.ttl){
          w.__phw_safe_draw_cache.list = buildDisplayList(w);
          w.__phw_safe_draw_cache.ts = now;
        }
        var map = w.__phw_safe_draw_cache.list || [];
        return (displayIndex >= 0 && displayIndex < map.length) ? map[displayIndex] : -1;
      }

      // safe drawItem: compute data index, use itemRect(displayIndex) for layout, draw item
      win.drawItem = function(displayIndex){
        try {
          var di = getDataIndexForDisplay(this, displayIndex);
          if(di < 0) return;
          var item = this._data && this._data[di];
          if(!item) return;
          var numberWidth = this.numberWidth ? this.numberWidth() : 0;
          var rect = this.itemRect ? this.itemRect(displayIndex) : { x:0, y:0, width: this.contentsWidth ? this.contentsWidth() : 0, height:0 };
          rect.width -= (this.textPadding ? this.textPadding() : 0);

          try { this.changePaintOpacity(PHPlugins && PHPlugins.PHWarehouse && PHPlugins.PHWarehouse.verifyItem ? PHPlugins.PHWarehouse.verifyItem(item) : 1); } catch(e){ this.changePaintOpacity(1); }
          try { this.drawItemName(item, rect.x, rect.y, rect.width - numberWidth); } catch(e){}
          try {
            if (PHPlugins && PHPlugins.PHWarehouse && PHPlugins.PHWarehouse._lastOption == 1) {
              if(this.drawItemNumber) this.drawItemNumber(item, rect.x, rect.y, rect.width);
            } else if (PHPlugins && PHPlugins.PHWarehouse && PHPlugins.PHWarehouse._lastOption == 0) {
              if(this.drawWarehouseItemNumber) this.drawWarehouseItemNumber(item, rect.x, rect.y, rect.width);
            }
          } catch(e){}
          try { this.changePaintOpacity(1); } catch(e){}
        } catch(e){
          try { if(win.__phw_safe_draw_orig && win.__phw_safe_draw_orig.drawItem) return win.__phw_safe_draw_orig.drawItem.call(this, displayIndex); } catch(e){}
        }
      };

      // override item accessor so other code gets mapped item
      win.item = function(displayIndex){
        try {
          var di = getDataIndexForDisplay(this, displayIndex);
          if(di < 0) return null;
          return this._data && this._data[di];
        } catch(e){ return null; }
      };

      // wrap loadItems so we align _data to canonical order after population
      if(typeof win.loadItems === 'function' && !win.__phw_loadItems_wrapped){
        win.__phw_loadItems_wrapped = true;
        win.__phw_loadItems_orig = win.loadItems;
        win.loadItems = function(){
          var res = win.__phw_loadItems_orig.apply(this, arguments);
          try { alignWindowDataToCanonical(this); } catch(e){}
          return res;
        };
      }

      // perform an immediate alignment so UI rebuilds now
      try { alignWindowDataToCanonical(win); } catch(e){}
      try { if(typeof win.refresh === 'function') win.refresh(); } catch(e){}
      win.__phw_safe_draw_installed = true;
      return true;
    } catch(e){ return false; }
  }

  function patchAllInstances(){
    var s = SceneManager._scene;
    if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return 0;
    var count = 0;
    s._windowLayer.children.forEach(function(w){
      if(installSafeDraw(w)) count++;
    });
    return count;
  }

  // Wait one frame after the Warehouse scene opens, then patch instances
  var _onSceneCreate = SceneManager.onSceneCreate;
  SceneManager.onSceneCreate = function(){
    _onSceneCreate.apply(this, arguments);
    try {
      requestAnimationFrame(function(){
        try { setTimeout(function(){ patchAllInstances(); }, 0); } catch(e){}
      });
    } catch(e){
      try { setTimeout(patchAllInstances, 0); } catch(e){}
    }
  };

  // Also patch immediately if scene already open
  try { setTimeout(patchAllInstances, 0); } catch(e){}

  // Restore function
  window.PHW_SafeAuto_restore = function(){
    var s = SceneManager._scene;
    if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PL+': nothing to restore');
    s._windowLayer.children.forEach(function(w){
      try {
        if(w && w.__phw_safe_draw_orig){
          if(w.__phw_safe_draw_orig.drawItem) w.drawItem = w.__phw_safe_draw_orig.drawItem;
          if(w.__phw_safe_draw_orig.item) w.item = w.__phw_safe_draw_orig.item;
          if(w.__phw_loadItems_orig) { w.loadItems = w.__phw_loadItems_orig; delete w.__phw_loadItems_orig; delete w.__phw_loadItems_wrapped; }
          delete w.__phw_safe_draw_orig;
          delete w.__phw_safe_draw_cache;
          delete w.__phw_safe_draw_installed;
        }
      } catch(e){}
    });
    console.log(PL+': restored original drawItem/item/loadItems where present. Reload scene to fully reset.');
  };

})();

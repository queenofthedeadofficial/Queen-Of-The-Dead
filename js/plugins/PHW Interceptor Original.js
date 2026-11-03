/*:
 * @plugindesc PHW UI prefilter — remove items that don't match warehouse rule before display (context-aware verifier)
 * @author You
 */
(function(){
  'use strict';

  // Helper: resolve wrapper -> DB object
  function resolveEntry(e){
    return e && (e.item || e.object || e._item) || e || null;
  }

  // Helper: find DB record by id across items/weapons/armors
  function findDbRecordById(id){
    if(!id) return null;
    if(window.$dataItems && $dataItems[id]) return $dataItems[id];
    if(window.$dataWeapons && $dataWeapons[id]) return $dataWeapons[id];
    if(window.$dataArmors && $dataArmors[id]) return $dataArmors[id];
    return null;
  }

  // Default predicate: checks warehouse meta.ruleTag or category string for a tag name,
  // then checks the DB record's note or name for that tag. Adapt to your project's tagging.
  function matchesWarehouseRule(dbRecord, ruleTag){
    if(!dbRecord) return false;
    if(!ruleTag) return true; // if no rule specified, allow by default
    // Example checks: note tag <rule:TAG> or simple <TAG> or name contains TAG
    var note = (dbRecord.note || '').toString();
    var tag = String(ruleTag).replace(/[^\w-]/g,''); // sanitize
    var re1 = new RegExp('<rule\\s*:\\s*' + tag + '>', 'i');
    var re2 = new RegExp('<' + tag + '>', 'i');
    if(re1.test(note) || re2.test(note)) return true;
    if((dbRecord.name || '').toString().toLowerCase().indexOf(tag.toLowerCase()) !== -1) return true;
    return false;
  }

  // Try to read the active warehouse metadata or category from PH plugin state or window instance.
  function getWarehouseRuleForContext(ph, win){
    try {
      // 1) PH plugin common fields
      var active = (ph && (ph._lastActive || ph._activeWarehouse || ph._active));
      var category = (ph && (ph._lastCategory || ph._lastCat || ph._activeCategory));
      if(ph && ph._warehouses && active && ph._warehouses[active] && ph._warehouses[active].meta){
        var meta = ph._warehouses[active].meta;
        if(meta.ruleTag) return meta.ruleTag;
        if(meta.categoryTag) return meta.categoryTag;
      }
      // 2) window instance fields (some PH windows store active names)
      if(win){
        if(win._warehouseMeta && win._warehouseMeta.ruleTag) return win._warehouseMeta.ruleTag;
        if(win._categoryName) return win._categoryName;
        if(win._activeCategory) return win._activeCategory;
      }
      // 3) fallback to category variable from ph
      if(category) return category;
    } catch(e){}
    return null;
  }

  // Determine window's active/category context in a robust way
  function detectWindowContext(ph, win){
    var winActive = null;
    var winCategory = null;
    try {
      // common window properties
      winActive = win._activeName || win._warehouseName || win._warehouseId || win._warehouseKey || win._warehouse || win._active || null;
      winCategory = win._categoryName || win._activeCategory || win._category || win._lastCategory || null;
      // fallback to PH plugin fields if window lacks them
      if(!winActive && ph) winActive = ph._lastActive || ph._activeWarehouse || ph._active || null;
      if(!winCategory && ph) winCategory = ph._lastCategory || ph._activeCategory || ph._lastCat || null;
    } catch(e){}
    return { winActive: winActive, winCategory: winCategory };
  }

  // Install wrapper on a warehouse window instance
  function installPrefilterOnWindow(win){
    try {
      if(!win || !win.constructor) return false;
      var cname = String(win.constructor.name || '');
      if(cname.indexOf('WarehouseItemList') === -1 && cname.indexOf('Warehouse') === -1) return false;
      if(win.__phw_prefilter_installed) return false;

      // backup original loadItems and refresh
      win.__phw_prefilter_orig = win.__phw_prefilter_orig || {
        loadItems: win.loadItems,
        refresh: win.refresh
      };

      // helper: context-aware keep test using PH's verifier when available
      function shouldKeepEntry(ph, winContext, entry){
        try {
          var resolved = resolveEntry(entry);
          // prefer PH's own verifier if present, but call it with the window's context
          if(ph && typeof ph.verifyItem === 'function'){
            var savedActive = ph._lastActive;
            var savedCategory = ph._lastCategory;
            try {
              if(winContext.winActive != null) ph._lastActive = winContext.winActive;
              if(winContext.winCategory != null) ph._lastCategory = winContext.winCategory;
              return !!ph.verifyItem(resolved);
            } catch(e){
              // fall through to fallback below
            } finally {
              if(ph){
                ph._lastActive = savedActive;
                ph._lastCategory = savedCategory;
              }
            }
          }
          // fallback: use ruleTag matching based on detected context
          var ruleTag = getWarehouseRuleForContext(ph, win);
          var id = resolved && (resolved.id || resolved.itemId || resolved._id) || null;
          var db = null;
          if(id && window.$dataItems && $dataItems[id]) db = $dataItems[id];
          if(!db && id && window.$dataWeapons && $dataWeapons[id]) db = $dataWeapons[id];
          if(!db && id && window.$dataArmors && $dataArmors[id]) db = $dataArmors[id];
          return matchesWarehouseRule(db, ruleTag);
        } catch(e){
          if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter shouldKeepEntry error', e);
          return false;
        }
      }

      // wrap loadItems
      if(typeof win.__phw_prefilter_orig.loadItems === 'function'){
        win.loadItems = function(){
          // call original to populate this._data
          var res = win.__phw_prefilter_orig.loadItems.apply(this, arguments);
          try {
            var ph = window.PHPlugins && PHPlugins.PHWarehouse;
            var ctx = detectWindowContext(ph, this);
            if(Array.isArray(this._data) && this._data.length){
              var filtered = [];
              for(var i=0;i<this._data.length;i++){
                var entry = this._data[i];
                if(shouldKeepEntry(ph, ctx, entry)) filtered.push(entry);
              }
              this._data = filtered;
            }
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter loadItems error', e);
          }
          return res;
        };
      }

      // also wrap refresh to ensure any dynamic rebuilds are filtered
      if(typeof win.__phw_prefilter_orig.refresh === 'function'){
        win.refresh = function(){
          try {
            var ph = window.PHPlugins && PHPlugins.PHWarehouse;
            var ctx = detectWindowContext(ph, this);
            // call original refresh which may rebuild _data
            var res = win.__phw_prefilter_orig.refresh.apply(this, arguments);
            // then filter _data if present
            if(Array.isArray(this._data) && this._data.length){
              var filtered = [];
              for(var i=0;i<this._data.length;i++){
                var entry = this._data[i];
                if(shouldKeepEntry(ph, ctx, entry)) filtered.push(entry);
              }
              this._data = filtered;
            }
            return res;
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter refresh error', e);
            return win.__phw_prefilter_orig.refresh.apply(this, arguments);
          }
        };
      }

      win.__phw_prefilter_installed = true;
      return true;
    } catch(e){
      if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter install failed', e);
      return false;
    }
  }

  // Patch existing windows and future windows created on scene create
  function patchAllWarehouseWindows(){
    try {
      var s = SceneManager._scene;
      if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return 0;
      var count = 0;
      for(var i=0;i<s._windowLayer.children.length;i++){
        try { if(installPrefilterOnWindow(s._windowLayer.children[i])) count++; } catch(e){}
      }
      if(window.PHW_SafeAuto_Debug) console.log('PHW prefilter patched windows', count);
      return count;
    } catch(e){ return 0; }
  }

  // Hook scene creation to patch new windows
  var _onSceneCreate = SceneManager.onSceneCreate;
  SceneManager.onSceneCreate = function(){
    _onSceneCreate.apply(this, arguments);
    try { setTimeout(patchAllWarehouseWindows, 0); } catch(e){}
  };

  // initial patch attempt
  try { setTimeout(patchAllWarehouseWindows, 0); } catch(e){}

  // expose restore helper
  window.PHW_Prefilter_restore = function(){
    try {
      var s = SceneManager._scene;
      if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
        s._windowLayer.children.forEach(function(w){
          try {
            if(w && w.__phw_prefilter_installed && w.__phw_prefilter_orig){
              if(w.__phw_prefilter_orig.loadItems) w.loadItems = w.__phw_prefilter_orig.loadItems;
              if(w.__phw_prefilter_orig.refresh) w.refresh = w.__phw_prefilter_orig.refresh;
              delete w.__phw_prefilter_orig;
              delete w.__phw_prefilter_installed;
            }
          } catch(e){}
        });
      }
      if(window.PHW_SafeAuto_Debug) console.log('PHW prefilter restored');
    } catch(e){}
  };

})();

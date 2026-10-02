/*:
 * @plugindesc PHW UI prefilter — remove items that don't match warehouse rule before display (context-aware verifier + earliest alphabetical sort) 
 * @author You (patched)
 * @help
 * - Sets PH context before the game's canonical builder runs, so the builder
 *   constructs the candidate list in the correct context.
 * - Filters invalid items and alphabetizes the final candidate list immediately
 *   after the builder assigns this._data (the earliest safe point).
 * - Wraps loadItems and refresh non-destructively and exposes PHW_Prefilter_restore().
 * - Toggle debug with: window.PHW_SafeAuto_Debug = true;
 */
(function(){
  'use strict';

  window.PHW_SafeAuto_Debug = window.PHW_SafeAuto_Debug || false;

  /* ---------- helpers ---------- */

  function resolveEntry(e){
    return e && (e.item || e.object || e._item) || e || null;
  }

  function findDbRecordById(id){
    if(!id) return null;
    if(window.$dataItems && $dataItems[id]) return $dataItems[id];
    if(window.$dataWeapons && $dataWeapons[id]) return $dataWeapons[id];
    if(window.$dataArmors && $dataArmors[id]) return $dataArmors[id];
    return null;
  }

  function nameKey(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || '').toString().trim();
      raw = raw.replace(/\x1b

\[\d+m/g, '').replace(/\\c

\[\d+\]

/g, '').replace(/_/g, ' ').trim();
      if(!raw && (obj.id || obj.itemId || obj._id)) raw = String(obj.id || obj.itemId || obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }

  function matchesWarehouseRule(dbRecord, ruleTag){
    if(!dbRecord) return false;
    if(!ruleTag) return true;
    var note = (dbRecord.note || '').toString();
    var tag = String(ruleTag).replace(/[^\w-]/g,'');
    var re1 = new RegExp('<rule\\s*:\\s*' + tag + '>', 'i');
    var re2 = new RegExp('<' + tag + '>', 'i');
    if(re1.test(note) || re2.test(note)) return true;
    if((dbRecord.name || '').toString().toLowerCase().indexOf(tag.toLowerCase()) !== -1) return true;
    return false;
  }

  function getWarehouseRuleForContext(ph, win){
    try {
      var active = (ph && (ph._lastActive || ph._activeWarehouse || ph._active));
      var category = (ph && (ph._lastCategory || ph._lastCat || ph._activeCategory));
      if(ph && ph._warehouses && active && ph._warehouses[active] && ph._warehouses[active].meta){
        var meta = ph._warehouses[active].meta;
        if(meta.ruleTag) return meta.ruleTag;
        if(meta.categoryTag) return meta.categoryTag;
      }
      if(win){
        if(win._warehouseMeta && win._warehouseMeta.ruleTag) return win._warehouseMeta.ruleTag;
        if(win._categoryName) return win._categoryName;
        if(win._activeCategory) return win._activeCategory;
      }
      if(category) return category;
    } catch(e){}
    return null;
  }

  function detectWindowContext(ph, win){
    var winActive = null;
    var winCategory = null;
    try {
      winActive = win._activeName || win._warehouseName || win._warehouseId || win._warehouseKey || win._warehouse || win._active || null;
      winCategory = win._categoryName || win._activeCategory || win._category || win._lastCategory || null;
      if(!winActive && ph) winActive = ph._lastActive || ph._activeWarehouse || ph._active || null;
      if(!winCategory && ph) winCategory = ph._lastCategory || ph._activeCategory || ph._lastCat || null;
    } catch(e){}
    return { winActive: winActive, winCategory: winCategory };
  }

  function makeAlphabeticalComparator(){
    return function(a,b){
      var A = resolveEntry(a), B = resolveEntry(b);
      var na = nameKey(A), nb = nameKey(B);
      if(na === nb) return (a && a.__origIndex || 0) - (b && b.__origIndex || 0);
      return na.localeCompare(nb);
    };
  }

  /* ---------- installer ---------- */

  function installPrefilterOnWindow(win){
    try {
      if(!win || !win.constructor) return false;
      var cname = String(win.constructor.name || '');
      if(cname.indexOf('WarehouseItemList') === -1 && cname.indexOf('Warehouse') === -1) return false;
      if(win.__phw_prefilter_installed) return false;

      // backup originals
      win.__phw_prefilter_orig = win.__phw_prefilter_orig || {
        loadItems: win.loadItems,
        refresh: win.refresh
      };

      // shouldKeepEntry: try wrapper then resolved, then fallback ruleTag using actual window
      function shouldKeepEntry(ph, winContext, winInstance, entry){
        try {
          var resolved = resolveEntry(entry);

          if(ph && typeof ph.verifyItem === 'function'){
            var savedActive = ph._lastActive;
            var savedCategory = ph._lastCategory;
            try {
              if(winContext && winContext.winActive != null) ph._lastActive = winContext.winActive;
              if(winContext && winContext.winCategory != null) ph._lastCategory = winContext.winCategory;

              try { if(ph.verifyItem(entry)) return true; } catch(e){}
              try { if(ph.verifyItem(resolved)) return true; } catch(e){}
            } catch(e){
              // fall through
            } finally {
              if(ph){
                ph._lastActive = savedActive;
                ph._lastCategory = savedCategory;
              }
            }
          }

          var ruleTag = getWarehouseRuleForContext(ph, winInstance);
          if(!ruleTag && winContext && winContext.winCategory) ruleTag = winContext.winCategory;
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

      // filter+alphabetize routine (runs after builder assigns this._data)
      function filterAndSortFinalData(winInstance){
        try {
          var ph = window.PHPlugins && PHPlugins.PHWarehouse;
          var ctx = detectWindowContext(ph, winInstance);
          if(!Array.isArray(winInstance._data)) return;

          // attach original index for stable tie-breaker
          for(var j=0;j<winInstance._data.length;j++){
            var e = winInstance._data[j];
            if(e && typeof e === 'object') e.__origIndex = e.__origIndex || j;
          }

          var filtered = [];
          for(var i=0;i<winInstance._data.length;i++){
            var entry = winInstance._data[i];
            if(shouldKeepEntry(ph, ctx, winInstance, entry)){
              filtered.push(entry);
            }
          }

          // replace _data synchronously with the final candidate set
          winInstance._data = filtered;

          // alphabetize synchronously (earliest safe point after builder)
          if(Array.isArray(winInstance._data) && winInstance._data.length){
            var cmp = makeAlphabeticalComparator();
            winInstance._data.sort(cmp);
          }
        } catch(e){
          if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter filterAndSortFinalData error', e);
        }
      }

      // Wrap loadItems: set PH context BEFORE calling original builder (so builder runs in correct context),
      // then run filter+alphabetize immediately after the builder returns (earliest safe sort).
      if(typeof win.__phw_prefilter_orig.loadItems === 'function'){
        win.loadItems = function(){
          var ph = window.PHPlugins && PHPlugins.PHWarehouse;
          var ctx = detectWindowContext(ph, this);

          // set PH context for the duration of the builder
          var savedActive = ph && ph._lastActive;
          var savedCategory = ph && ph._lastCategory;
          try {
            if(ph){
              if(ctx.winActive != null) ph._lastActive = ctx.winActive;
              if(ctx.winCategory != null) ph._lastCategory = ctx.winCategory;
            }
            // call original builder (it will populate this._data under the correct context)
            var res = win.__phw_prefilter_orig.loadItems.apply(this, arguments);
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter loadItems (builder) error', e);
            var res = win.__phw_prefilter_orig.loadItems.apply(this, arguments);
          } finally {
            // restore PH context immediately after builder finishes
            if(ph){
              ph._lastActive = savedActive;
              ph._lastCategory = savedCategory;
            }
          }

          // Now run the final filter+alphabetize on the canonical this._data
          try {
            filterAndSortFinalData(this);
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter loadItems post-filter error', e);
          }

          // return whatever the original returned (if any)
          return typeof res !== 'undefined' ? res : undefined;
        };
      }

      // Wrap refresh: ensure final data is filtered+sorted before draw in case builder ran elsewhere.
      if(typeof win.__phw_prefilter_orig.refresh === 'function'){
        win.refresh = function(){
          try {
            // run filter+sort at start of refresh (latest safe point before draw)
            filterAndSortFinalData(this);
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter pre-refresh error', e);
          }
          try {
            var res = win.__phw_prefilter_orig.refresh.apply(this, arguments);
            // run again after refresh in case refresh rebuilt _data internally
            try { filterAndSortFinalData(this); } catch(e){ if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter post-refresh error', e); }
            return res;
          } catch(e){
            if(window.PHW_SafeAuto_Debug) console.warn('PHW prefilter refresh error', e);
            return win.__phw_prefilter_orig.refresh.apply(this, arguments);
          }
        };
      }

      win.__phw_prefilter_installed = true;
      if(window.PHW_SafeAuto_Debug) console.log('PHW prefilter installed on', cname);
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

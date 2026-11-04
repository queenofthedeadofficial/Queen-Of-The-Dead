/*:
 * @plugindesc Ensure YEP Item Synthesis recipe windows are filtered by <Synthesis Category: X> notetags. Place after YEP Item Synthesis. DEBUG logs to console. @author You
 */
(function() {
  'use strict';

  var DEBUG = true; // set false to silence logs
  var CATEGORY_FLAG = '_synthFilter'; // $gameSystem flag name

  // Normalize category names for comparison
  function normalizeName(s) {
    if (s === undefined || s === null) return '';
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Resolve a data object from a variety of entry shapes (id, object, nested)
  function resolveDataFromEntry(entry) {
    if (!entry) return null;
    // numeric id
    if (typeof entry === 'number') {
      if ($dataItems && $dataItems[entry]) return $dataItems[entry];
      if ($dataWeapons && $dataWeapons[entry]) return $dataWeapons[entry];
      if ($dataArmors && $dataArmors[entry]) return $dataArmors[entry];
      return null;
    }
    // common id keys
    var idKeys = ['itemId','resultId','recipeId','productId','id'];
    for (var i = 0; i < idKeys.length; i++) {
      var k = idKeys[i];
      if (entry[k] !== undefined && entry[k] !== null) {
        var v = entry[k];
        if (typeof v === 'number') {
          if ($dataItems && $dataItems[v]) return $dataItems[v];
          if ($dataWeapons && $dataWeapons[v]) return $dataWeapons[v];
          if ($dataArmors && $dataArmors[v]) return $dataArmors[v];
        }
      }
    }
    // nested objects
    var nested = ['item','recipe','product','result','object'];
    for (var j = 0; j < nested.length; j++) {
      var nk = nested[j];
      if (entry[nk] && typeof entry[nk] === 'object') return entry[nk];
    }
    // if entry already looks like a data object (has note or meta)
    if (entry.meta || entry.note || entry.name) return entry;
    // fallback: if entry has id and $dataItems contains it
    if (entry.id && typeof entry.id === 'number' && $dataItems && $dataItems[entry.id]) return $dataItems[entry.id];
    return null;
  }

  // Check if a data object has the synthesis category (meta or note)
  function hasSynthesisCategory(dataObj, category) {
    if (!dataObj || !category) return false;
    var want = normalizeName(category);
    // meta check
    if (dataObj.meta && typeof dataObj.meta === 'object') {
      for (var k in dataObj.meta) {
        if (!dataObj.meta.hasOwnProperty(k)) continue;
        var keyNorm = k.toLowerCase().replace(/[\s_\-]/g, '');
        if (keyNorm === 'synthesiscategory') {
          var val = normalizeName(dataObj.meta[k]);
          if (val === want) return true;
          if (val + 's' === want) return true;
          if (val.replace(/s$/,'') === want) return true;
        }
      }
    }
    // note check: <Synthesis Category: X>
    var note = (dataObj.note || '').toString();
    if (note) {
      var safe = function(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'); };
      var wantSafe = safe(category);
      var wantSing = want.replace(/s$/i,'');
      var reAngle = new RegExp('<\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*>', 'i');
      var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*(\\n|$)', 'i');
      if (reAngle.test(note) || rePlain.test(note)) return true;
    }
    return false;
  }

  // Build a filtered array from a source array (handles ids and objects)
  function buildFilteredArray(sourceArray, category) {
    if (!Array.isArray(sourceArray)) return [];
    var out = [];
    for (var i = 0; i < sourceArray.length; i++) {
      var entry = sourceArray[i];
      var data = resolveDataFromEntry(entry);
      if (data && hasSynthesisCategory(data, category)) {
        out.push(entry);
      }
    }
    return out;
  }

  // Apply filter to a window: preserve original data, replace arrays, call refresh/select
  function applyFilterToWindow(win, category) {
    if (!win || !category) return 0;
    if (win._applyingSynthFilter) return 0;
    win._applyingSynthFilter = true;
    try {
      if (!win._originalData) {
        // capture whichever array the window uses
        if (Array.isArray(win._data)) win._originalData = win._data.slice(0);
        else if (Array.isArray(win._list)) win._originalData = win._list.slice(0);
        else if (Array.isArray(win.items)) win._originalData = win.items.slice(0);
        else win._originalData = null;
      }
      var source = win._originalData || (Array.isArray(win._data) ? win._data : (Array.isArray(win._list) ? win._list : (Array.isArray(win.items) ? win.items : [])));
      var filtered = buildFilteredArray(source, category);

      // replace common properties
      if (Array.isArray(win._data)) win._data = filtered.slice(0);
      if (Array.isArray(win._list)) win._list = filtered.slice(0);
      if (Array.isArray(win._items)) win._items = filtered.slice(0);
      if (Array.isArray(win._recipes)) win._recipes = filtered.slice(0);
      if (Array.isArray(win.items)) win.items = filtered.slice(0);

      // if window exposes setItemList, use it
      if (typeof win.setItemList === 'function') {
        try { win.setItemList(filtered.slice(0)); } catch (e) { /* ignore */ }
      }

      if (typeof win.refresh === 'function') win.refresh();
      if (typeof win.select === 'function') win.select(0);
      if (typeof win.setTopRow === 'function') win.setTopRow(0);

      if (DEBUG) {
        var name = (win.constructor && win.constructor.name) ? win.constructor.name : '(window)';
        console.log('[SYNTH-FILTER] Applied to', name, 'filteredCount=', filtered.length);
      }
      return filtered.length;
    } catch (e) {
      console.error('[SYNTH-FILTER] apply error', e);
      return 0;
    } finally {
      try { win._applyingSynthFilter = false; } catch (e) { win._applyingSynthFilter = null; }
    }
  }

  // Restore original arrays when needed
  function restoreWindowOriginal(win) {
    if (!win || !win._originalData) return;
    try {
      var orig = win._originalData.slice(0);
      if (Array.isArray(win._data)) win._data = orig.slice(0);
      if (Array.isArray(win._list)) win._list = orig.slice(0);
      if (Array.isArray(win._items)) win._items = orig.slice(0);
      if (Array.isArray(win._recipes)) win._recipes = orig.slice(0);
      if (Array.isArray(win.items)) win.items = orig.slice(0);
      if (typeof win.setItemList === 'function') {
        try { win.setItemList(orig.slice(0)); } catch (e) {}
      }
      if (typeof win.refresh === 'function') win.refresh();
      if (DEBUG) {
        var name = (win.constructor && win.constructor.name) ? win.constructor.name : '(window)';
        console.log('[SYNTH-FILTER] Restored original data for', name);
      }
    } catch (e) { /* ignore */ }
  }

  // Patch common list builders so filter runs after the original makeItemList/refresh
  (function() {
    // Patch Window_ItemList.makeItemList (if present)
    if (typeof Window_ItemList !== 'undefined' && Window_ItemList.prototype && !Window_ItemList.prototype._synthFilterPatched) {
      var _orig_makeItemList = Window_ItemList.prototype.makeItemList;
      Window_ItemList.prototype.makeItemList = function() {
        if (_orig_makeItemList) _orig_makeItemList.call(this);
        try {
          var cat = $gameSystem && $gameSystem[CATEGORY_FLAG] ? $gameSystem[CATEGORY_FLAG] : null;
          if (cat) {
            applyFilterToWindow(this, cat);
            // keep window hidden/deactivated if desired (prevents default preview)
            try { if (typeof this.hide === 'function') this.hide(); } catch (e) {}
            try { if (typeof this.deactivate === 'function') this.deactivate(); } catch (e) {}
          }
        } catch (e) { if (DEBUG) console.error('[SYNTH-FILTER] makeItemList patch error', e); }
      };
      Window_ItemList.prototype._synthFilterPatched = true;
    }

    // Patch Window_Selectable.refresh to reapply filter after refresh
    if (typeof Window_Selectable !== 'undefined' && Window_Selectable.prototype && !Window_Selectable.prototype._synthFilterRefreshPatched) {
      var _orig_refresh = Window_Selectable.prototype.refresh;
      Window_Selectable.prototype.refresh = function() {
        if (_orig_refresh) _orig_refresh.call(this);
        try {
          var cat = $gameSystem && $gameSystem[CATEGORY_FLAG] ? $gameSystem[CATEGORY_FLAG] : null;
          if (cat) {
            // Only apply to windows that look like recipe/item lists
            var likely = false;
            if (Array.isArray(this._data) || Array.isArray(this._list) || Array.isArray(this.items) || typeof this.setItemList === 'function') likely = true;
            if (likely) {
              applyFilterToWindow(this, cat);
              try { if (typeof this.hide === 'function') this.hide(); } catch (e) {}
              try { if (typeof this.deactivate === 'function') this.deactivate(); } catch (e) {}
            }
          }
        } catch (e) { if (DEBUG) console.error('[SYNTH-FILTER] refresh patch error', e); }
      };
      Window_Selectable.prototype._synthFilterRefreshPatched = true;
    }
  })();

  // Patch synthesis scene create to apply filter and ensure the filtered window is shown/activated
  (function() {
    var sceneNames = ['Scene_ItemSynthesis','Scene_Synthesis'];
    var synthScene = null;
    for (var i = 0; i < sceneNames.length; i++) {
      if (typeof window[sceneNames[i]] !== 'undefined') { synthScene = window[sceneNames[i]]; break; }
    }
    if (!synthScene) {
      if (DEBUG) console.log('[SYNTH-FILTER] No synthesis scene detected; plugin inactive for scene patch.');
      return;
    }
    var proto = synthScene.prototype;
    var _orig_create = proto.create;
    proto.create = function() {
      if (_orig_create) _orig_create.call(this);
      try {
        var cat = $gameSystem && $gameSystem[CATEGORY_FLAG] ? $gameSystem[CATEGORY_FLAG] : null;
        if (cat) {
          // find candidate windows
          var candidates = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow','_commandWindow','_categoryWindow'];
          var found = null;
          for (var j = 0; j < candidates.length; j++) {
            var p = candidates[j];
            if (this[p]) { found = this[p]; break; }
          }
          if (!found) {
            for (var k in this) {
              if (!this.hasOwnProperty(k)) continue;
              var obj = this[k];
              if (obj && typeof obj === 'object' && (typeof obj.makeItemList === 'function' || typeof obj.setItemList === 'function' || typeof obj.refresh === 'function')) {
                found = obj; break;
              }
            }
          }
          if (found) {
            // restore original data then apply filter and show/activate filtered window
            restoreWindowOriginal(found);
            if (typeof found.makeItemList === 'function') {
              try { found.makeItemList(); } catch (e) {}
            }
            var count = applyFilterToWindow(found, cat);
            if (count > 0) {
              try { if (typeof found.show === 'function') found.show(); } catch (e) {}
              try { if (typeof found.activate === 'function') found.activate(); } catch (e) {}
            } else {
              if (DEBUG) console.warn('[SYNTH-FILTER] No recipes matched category "' + cat + '" in found window.');
            }
            // hide any injected category window so it behaves like a dedicated menu
            try { if (this._synthCategoryCommandWindow && typeof this._synthCategoryCommandWindow.hide === 'function') this._synthCategoryCommandWindow.hide(); } catch (e) {}
          } else {
            if (DEBUG) console.warn('[SYNTH-FILTER] Could not find recipe/list window in synthesis scene to apply filter.');
          }
          // clear the flag so normal opens behave normally
          $gameSystem[CATEGORY_FLAG] = null;
        }
      } catch (err) {
        console.error('[SYNTH-FILTER] synth scene create patch error', err);
      }
    };
  })();

  // Utility: call this to open synthesis for a category
  window.openSynthesisCategory = function(category) {
    if (!category) return;
    $gameSystem[CATEGORY_FLAG] = category;
    $gameSystem._synthDirectOpen = true;
    var sceneName = (typeof Scene_ItemSynthesis !== 'undefined') ? Scene_ItemSynthesis : (typeof Scene_Synthesis !== 'undefined' ? Scene_Synthesis : null);
    if (!sceneName) {
      if (DEBUG) console.error('[SYNTH-FILTER] synthesis scene not found for openSynthesisCategory.');
      return;
    }
    try { SceneManager.push(sceneName); } catch (e) { if (DEBUG) console.error('[SYNTH-FILTER] push failed', e); }
  };

  if (DEBUG) console.log('[SYNTH-FILTER] Loaded. Use openSynthesisCategory("Foods") etc. Check console for logs.');
})();

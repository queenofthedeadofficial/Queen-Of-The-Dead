/*:
 * @plugindesc (Simple) Open YEP Item Synthesis filtered by category. Adds openSynthesisCategory(category) and applies filter when scene opens. Place after YEP Item Synthesis. @author You
 * @help
 * Usage:
 *   openSynthesisCategory('Foods');
 *   openSynthesisCategory('Potions');
 *   openSynthesisCategory('Soups');
 *
 * Make sure your recipes/items include a notetag like:
 *   <Synthesis Category: Foods>
 * or
 *   <Synthesis Category: Potions>
 *
 * Plugin must be below YEP Item Synthesis in the Plugin Manager.
 */
(function() {
  'use strict';

  var DEBUG = false;

  // -------------------------
  // Helper: resolve data entry
  // -------------------------
  function dataFromEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'number') {
      if ($dataItems && $dataItems[entry]) return $dataItems[entry];
      if ($dataWeapons && $dataWeapons[entry]) return $dataWeapons[entry];
      if ($dataArmors && $dataArmors[entry]) return $dataArmors[entry];
      return null;
    }
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
    var nested = ['item','recipe','product','result','object'];
    for (var j = 0; j < nested.length; j++) {
      var nk = nested[j];
      if (entry[nk] && typeof entry[nk] === 'object') return entry[nk];
    }
    if (entry.meta && typeof entry.meta === 'object') return entry;
    if (entry.note && typeof entry.note === 'string') return entry;
    if (entry.id && typeof entry.id === 'number' && $dataItems && $dataItems[entry.id]) return $dataItems[entry.id];
    return null;
  }

  // -------------------------
  // Helper: check category tag
  // -------------------------
  function normalizeCategoryName(s) {
    if (!s && s !== 0) return '';
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function objectHasSynthesisCategory(obj, category) {
    if (!obj || !category) return false;
    var data = dataFromEntry(obj);
    if (!data) return false;
    var want = normalizeCategoryName(category);
    // check meta first (YEP often puts parsed meta)
    if (data.meta && typeof data.meta === 'object') {
      for (var key in data.meta) {
        if (!data.meta.hasOwnProperty(key)) continue;
        var k = key.toLowerCase().replace(/[\s_\-]/g, '');
        if (k === 'synthesiscategory') {
          var val = normalizeCategoryName(data.meta[key]);
          if (val === want) return true;
          // allow singular/plural match
          if (val + 's' === want || (val.endsWith('s') && val.slice(0,-1) === want)) return true;
        }
      }
    }
    // fallback: check raw note text for <Synthesis Category: X>
    var note = (data.note || '').toString();
    if (!note) return false;
    var safe = function(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'); };
    var wantSafe = safe(category);
    var wantSing = want.replace(/s$/i,'');
    var re = new RegExp('<\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*>', 'i');
    var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*(\\n|$)', 'i');
    var matched = re.test(note) || rePlain.test(note);
    if (DEBUG) {
      try {
        console.log('objectHasSynthesisCategory', {
          id: data.id || data.name || '(obj)',
          want: category,
          matched: matched
        });
      } catch (e) {}
    }
    return matched;
  }

  // -------------------------
  // Filtering helper
  // -------------------------
  function applyCategoryFilterToWindow(win, category) {
    if (!win || !category) return;
    if (win._applyingSynthFilter) return;
    win._applyingSynthFilter = true;
    try {
      var arrays = ['_data','_list','_items','_recipes','items'];
      for (var i = 0; i < arrays.length; i++) {
        var nm = arrays[i];
        if (Array.isArray(win[nm])) {
          if (!win._originalData) win._originalData = win[nm].slice(0);
          var source = win._originalData || win[nm];
          win[nm] = source.filter(function(entry) {
            return objectHasSynthesisCategory(entry, category);
          });
        }
      }
      if (typeof win.setItemList === 'function' && win._originalData) {
        try { win.setItemList(win._originalData.filter(function(entry){ return objectHasSynthesisCategory(entry, category); })); } catch (e) {}
      }
      if (typeof win.refresh === 'function') win.refresh();
      if (typeof win.select === 'function') win.select(0);
      if (typeof win.setTopRow === 'function') win.setTopRow(0);
    } catch (e) {
      console.error('applyCategoryFilterToWindow error', e);
    } finally {
      try { win._applyingSynthFilter = false; } catch (e) { win._applyingSynthFilter = null; }
    }
  }

  function restoreWindowOriginalData(win) {
    if (!win) return;
    try {
      if (win._originalData) {
        var arrays = ['_data','_list','_items','_recipes','items'];
        for (var i = 0; i < arrays.length; i++) {
          var nm = arrays[i];
          if (Array.isArray(win[nm])) win[nm] = win._originalData.slice(0);
        }
        if (typeof win.setItemList === 'function') {
          try { win.setItemList(win._originalData.slice(0)); } catch (e) {}
        }
        if (typeof win.refresh === 'function') win.refresh();
      }
    } catch (e) {}
  }

  // -------------------------
  // Public API: open category
  // -------------------------
  window.openSynthesisCategory = function(category) {
    if (!category) return;
    $gameSystem._synthFilter = category;
    $gameSystem._synthDirectOpen = true;
    var sceneName = (typeof Scene_ItemSynthesis !== 'undefined') ? Scene_ItemSynthesis : (typeof Scene_Synthesis !== 'undefined' ? Scene_Synthesis : null);
    if (!sceneName) {
      if (DEBUG) console.error('openSynthesisCategory: synthesis scene not found.');
      return;
    }
    try {
      SceneManager.push(sceneName);
    } catch (e) {
      if (DEBUG) console.error('openSynthesisCategory push failed', e);
    }
  };

  // -------------------------
  // Patch synthesis scene create to apply filter on direct-open
  // -------------------------
  var sceneCandidates = ['Scene_ItemSynthesis','Scene_Synthesis'];
  var synthScene = null;
  for (var i = 0; i < sceneCandidates.length; i++) {
    if (typeof window[sceneCandidates[i]] !== 'undefined') {
      synthScene = window[sceneCandidates[i]];
      break;
    }
  }

  if (synthScene) {
    var proto = synthScene.prototype;
    var _orig_create = proto.create;
    proto.create = function() {
      if (_orig_create) _orig_create.call(this);
      try {
        if ($gameSystem && $gameSystem._synthDirectOpen) {
          var key = $gameSystem._synthFilter || null;
          if (key) {
            // find the main recipe/list window robustly
            var found = null;
            var candidateProps = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow','_commandWindow','_categoryWindow'];
            for (var j = 0; j < candidateProps.length; j++) {
              var p = candidateProps[j];
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
              try { restoreWindowOriginalData(found); } catch (e) {}
              try { if (typeof found.makeItemList === 'function') found.makeItemList(); } catch (e) {}
              try { applyCategoryFilterToWindow(found, key); } catch (e) {}
              try { if (typeof found.show === 'function') found.show(); } catch (e) {}
              try { if (typeof found.activate === 'function') found.activate(); } catch (e) {}
              // hide any injected category window if present
              try { if (this._synthCategoryCommandWindow && typeof this._synthCategoryCommandWindow.hide === 'function') this._synthCategoryCommandWindow.hide(); } catch (e) {}
            } else {
              if (DEBUG) console.warn('Synthesis filter: could not find recipe/list window to apply filter.');
            }
          }
          // clear the direct-open flag so subsequent opens behave normally
          $gameSystem._synthDirectOpen = null;
        }
      } catch (err) {
        console.error('Synthesis direct-open handling failed', err);
      }
    };
  } else {
    if (DEBUG) console.log('No YEP synthesis scene detected; plugin inactive.');
  }

  // -------------------------
  // Helpful debug command (optional)
  // -------------------------
  if (DEBUG) {
    console.log('SynthesisCategory helper loaded. Use openSynthesisCategory("Foods") etc.');
  }

})();

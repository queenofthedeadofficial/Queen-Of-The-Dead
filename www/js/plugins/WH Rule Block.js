/*:
 * @plugindesc PH Warehouse: hide items in storage menus unless they contain the exact notetag <Menu Category: NAME> required by that storage unit. Supports explicit overrides in containerCategoryMap. 
 * @author Copilot (modified)
 * @help
 * This plugin filters the visible item list inside storage windows so items that
 * do not contain the exact notetag "<Menu Category: NAME>" are not shown.
 *
 * Configure explicit mappings in containerCategoryMap: numeric-id -> exact category name.
 * Example: 999: 'Rings'
 */

(function() {
  'use strict';

  // --- Explicit overrides: containerId -> exact category name ---
  var containerCategoryMap = {
    // 999: 'Rings',
    // 1000: 'Bracelets'
  };

  // Candidate deposit method names (kept for compatibility; not required for filtering)
  var candidateNames = ['addItem', 'depositItem', 'storeItem', 'addToWarehouse'];

  function buildExactNotetag(categoryName) {
    if (!categoryName) return null;
    return '<Menu Category: ' + categoryName + '>';
  }

  // Heuristic extractor for a warehouse/container object (same as previous plugin)
  function extractCategoryFromWarehouse(w) {
    if (!w) return null;
    if (w.menuCategory && typeof w.menuCategory === 'string' && w.menuCategory.trim()) return w.menuCategory.trim();
    if (w.category && typeof w.category === 'string' && w.category.trim()) return w.category.trim();

    var candidates = [];
    if (typeof w.rule === 'string') candidates.push(w.rule);
    if (typeof w.rules === 'string') candidates.push(w.rules);
    if (Array.isArray(w.rules)) w.rules.forEach(function(r){ if (typeof r === 'string') candidates.push(r); });
    if (Array.isArray(w._rules)) w._rules.forEach(function(r){ if (typeof r === 'string') candidates.push(r); });

    for (var i = 0; i < candidates.length; i++) {
      var txt = candidates[i];
      var m = txt.match(/Menu\s*Category\s*:\s*([^>\n\r]+)/i);
      if (m && m[1]) return m[1].trim();
    }

    var possible = w.name || w.title || w.label || w._name || w._title || null;
    if (possible) {
      var m2 = ('' + possible).match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
      if (m2 && m2[1]) return m2[1].trim();
      var m3 = ('' + possible).match(/<\s*([^:>]+?)\s*>/);
      if (m3 && m3[1]) return m3[1].trim();
    }

    if (w.rules && typeof w.rules === 'object') {
      if (w.rules.menuCategory) return String(w.rules.menuCategory).trim();
      if (w.rules.category) return String(w.rules.category).trim();
    }

    return null;
  }

  // Build mapping from manager runtime warehouses
  function buildMappingFromManager(manager) {
    var map = {};
    try {
      var warehouses = manager._warehouses || manager.warehouses || manager._containers || manager.containers || null;
      if (!warehouses) return map;

      if (Array.isArray(warehouses)) {
        for (var i = 0; i < warehouses.length; i++) {
          var w = warehouses[i];
          if (!w) continue;
          var id = (typeof w.id !== 'undefined') ? w.id : i;
          var required = extractCategoryFromWarehouse(w);
          if (required) map[id] = required;
        }
      } else {
        Object.keys(warehouses).forEach(function(k){
          var w = warehouses[k];
          if (!w) return;
          var id = isNaN(Number(k)) ? (w.id || k) : Number(k);
          var required = extractCategoryFromWarehouse(w);
          if (required) map[id] = required;
        });
      }
    } catch (e) {}
    return map;
  }

  function buildEffectiveMapping(manager) {
    var auto = buildMappingFromManager(manager);
    var effective = {};
    Object.keys(auto).forEach(function(k){ effective[k] = auto[k]; });
    Object.keys(containerCategoryMap).forEach(function(k){ effective[k] = containerCategoryMap[k]; });
    return effective;
  }

  // Determine required category name for a storage window instance
  function requiredCategoryForStorageWindow(win, managerEffectiveMap) {
    // 1) If window has an explicit container/warehouse id property
    var idProps = ['_warehouseId','_containerId','warehouseId','containerId','_warehouse','_container'];
    for (var i = 0; i < idProps.length; i++) {
      var p = idProps[i];
      if (typeof win[p] !== 'undefined' && win[p] !== null) {
        var val = win[p];
        // if val is object, try extractCategoryFromWarehouse
        if (typeof val === 'object') {
          var cat = extractCategoryFromWarehouse(val);
          if (cat) return cat;
        }
        // if val is numeric or string id, check effective map
        var key = (typeof val === 'string' && val.match(/^\d+$/)) ? Number(val) : val;
        if (managerEffectiveMap && managerEffectiveMap.hasOwnProperty(key)) return managerEffectiveMap[key];
      }
    }

    // 2) If window has a reference to a warehouse object
    if (win._warehouse && typeof win._warehouse === 'object') {
      var c = extractCategoryFromWarehouse(win._warehouse);
      if (c) return c;
    }
    if (win._container && typeof win._container === 'object') {
      var c2 = extractCategoryFromWarehouse(win._container);
      if (c2) return c2;
    }

    // 3) If window title/name contains a tag like "<Menu Category: NAME>" or "<NAME>"
    var nameProps = ['_title','_name','title','name','_windowName'];
    for (var j = 0; j < nameProps.length; j++) {
      var np = nameProps[j];
      if (win[np]) {
        var txt = '' + win[np];
        var m2 = txt.match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
        if (m2 && m2[1]) return m2[1].trim();
        var m3 = txt.match(/<\s*([^:>]+?)\s*>/);
        if (m3 && m3[1]) return m3[1].trim();
      }
    }

    // 4) Try to infer from the current scene's storage selection if available
    try {
      var scene = SceneManager._scene;
      if (scene && scene._storageMode && typeof scene._storageMode === 'string') {
        // scene._storageMode may be 'withdraw'/'deposit' — not helpful alone
      }
      // If scene has a current warehouse id selected, try that
      if (scene && (typeof scene._currentWarehouseId !== 'undefined')) {
        var id2 = scene._currentWarehouseId;
        if (managerEffectiveMap && managerEffectiveMap.hasOwnProperty(id2)) return managerEffectiveMap[id2];
      }
    } catch(e){}

    return null;
  }

  // Filter helper: returns true if item should be visible for requiredName
  function itemAllowedForCategory(item, requiredName) {
    if (!requiredName) return true; // no restriction
    if (!item) return false;
    var exactTag = buildExactNotetag(requiredName);
    if (!item.note) return false;
    return item.note.indexOf(exactTag) !== -1;
  }

  // Patch storage window refresh/makeItemList to filter _data
  function patchStorageWindowFiltering() {
    // Candidate storage window class names to patch
    var storageWindowClasses = [
      'Window_WarehouseStorage',
      'Window_PHWarehouseStorage',
      'Window_WarehouseItemList',
      'Window_WarehouseContents'
    ];

    // Build effective mapping snapshot from PHWarehouseManager if available
    var manager = (typeof PHWarehouseManager !== 'undefined') ? PHWarehouseManager : null;
    var effectiveMap = manager ? buildEffectiveMapping(manager) : {};

    storageWindowClasses.forEach(function(className) {
      var C = window[className];
      if (!C || !C.prototype) return;

      // Patch refresh if present
      if (typeof C.prototype.refresh === 'function' && !C.prototype._phmc_filtered) {
        var _origRefresh = C.prototype.refresh;
        C.prototype.refresh = function() {
          _origRefresh.call(this);
          try {
            // Determine required category for this window instance
            var requiredName = requiredCategoryForStorageWindow(this, effectiveMap);
            // If the window uses _data as the item array, filter it
            if (Array.isArray(this._data)) {
              // preserve selection index relative to filtered list
              var prevIndex = (typeof this.index === 'function') ? this.index() : (typeof this._index !== 'undefined' ? this._index : -1);
              var prevItem = (prevIndex >= 0 && this._data[prevIndex]) ? this._data[prevIndex] : null;

              var filtered = this._data.filter(function(it){
                return itemAllowedForCategory(it, requiredName);
              });

              // Replace _data only if filtering changed something
              if (filtered.length !== this._data.length) {
                this._data = filtered;
                // Try to restore selection to the previously selected item if still present
                if (prevItem) {
                  var newIndex = this._data.indexOf(prevItem);
                  if (newIndex >= 0) {
                    if (typeof this.select === 'function') this.select(newIndex);
                    else this._index = newIndex;
                  } else {
                    // default to first item
                    if (typeof this.select === 'function') this.select(0);
                    else this._index = (this._data.length ? 0 : -1);
                  }
                } else {
                  if (typeof this.select === 'function') this.select(0);
                  else this._index = (this._data.length ? 0 : -1);
                }
              }
            } else if (typeof this.makeItemList === 'function') {
              // If the window builds its list in makeItemList, wrap it to filter
              if (!this._phmc_makeItemListWrapped) {
                this._phmc_makeItemListWrapped = true;
                var _origMake = this.makeItemList;
                this.makeItemList = function() {
                  _origMake.call(this);
                  try {
                    var req = requiredCategoryForStorageWindow(this, effectiveMap);
                    if (Array.isArray(this._data)) {
                      this._data = this._data.filter(function(it){ return itemAllowedForCategory(it, req); });
                    }
                  } catch(e){}
                };
              }
            }
          } catch (e) {
            // don't break the window on errors
            console.warn('PHWarehouseMenuCategory filter error in refresh:', e);
          }
        };
        C.prototype._phmc_filtered = true;
      }

      // Also patch makeItemList directly if present and not already wrapped
      if (typeof C.prototype.makeItemList === 'function' && !C.prototype._phmc_makeItemListWrapped) {
        var _origMakeItemList = C.prototype.makeItemList;
        C.prototype.makeItemList = function() {
          _origMakeItemList.call(this);
          try {
            var requiredName = requiredCategoryForStorageWindow(this, effectiveMap);
            if (Array.isArray(this._data)) {
              this._data = this._data.filter(function(it){ return itemAllowedForCategory(it, requiredName); });
            }
          } catch(e){}
        };
        C.prototype._phmc_makeItemListWrapped = true;
      }
    });
  }

  // Apply patch now if possible, otherwise hook into Scene_Boot.start
  var applied = false;
  try {
    patchStorageWindowFiltering();
    applied = true;
  } catch (e) { applied = false; }

  if (!applied) {
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
      _Scene_Boot_start.call(this);
      try { patchStorageWindowFiltering(); } catch (e) {}
    };
  }

  // Expose debug helper
  if (!window._PHWarehouseMenuCategoryEnforce) {
    window._PHWarehouseMenuCategoryEnforce = {
      buildMapping: function() {
        if (typeof PHWarehouseManager === 'undefined') return {};
        return buildEffectiveMapping(PHWarehouseManager);
      },
      extractFromWarehouse: extractCategoryFromWarehouse,
      buildExactNotetag: buildExactNotetag
    };
  }

  console.log('PH Warehouse storage filtering plugin initialized.');
})();

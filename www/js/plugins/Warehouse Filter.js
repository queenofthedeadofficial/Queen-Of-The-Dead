/*:
 * @plugindesc PH Warehouse: hide items in storage lists unless item.note contains the exact <Menu Category: NAME> matching the storage unit name (e.g., <Rings> -> <Menu Category: Rings>). Safe, non-destructive filter. 
 * @author Copilot
 * @help
 * This plugin reads the storage window's name (or referenced container object)
 * and builds the exact notetag "<Menu Category: NAME>" where NAME is the storage
 * unit name without angle brackets. It then filters the storage window's _data
 * so only items with that exact notetag are shown.
 *
 * Install: drop into js/plugins and enable. Ensure it loads after PH_Warehouse.
 */

(function() {
  'use strict';

  // Build exact notetag string
  function buildExactNotetag(name) {
    return '<Menu Category: ' + name + '>';
  }

  // Try to extract a simple storage name from a string like "<Rings>" or "<Bracelets>"
  function extractNameFromTagText(text) {
    if (!text) return null;
    var m = ('' + text).match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
    if (m && m[1]) return m[1].trim();
    var m2 = ('' + text).match(/<\s*([^:>]+?)\s*>/);
    if (m2 && m2[1]) return m2[1].trim();
    return null;
  }

  // Extract name from a runtime warehouse/container object (if available)
  function extractNameFromContainerObj(obj) {
    if (!obj) return null;
    // common fields that may contain a display name or tag
    var possible = obj.name || obj.title || obj.label || obj._name || obj._title || obj.titleText;
    if (possible) {
      var n = extractNameFromTagText(possible);
      if (n) return n;
      // if the name is plain text like "Rings", accept it
      if (String(possible).trim()) return String(possible).trim();
    }
    // some PH shapes store a tag or rule string
    if (typeof obj.rule === 'string') {
      var r = extractNameFromTagText(obj.rule);
      if (r) return r;
    }
    if (Array.isArray(obj.rules)) {
      for (var i = 0; i < obj.rules.length; i++) {
        var rr = extractNameFromTagText(obj.rules[i]);
        if (rr) return rr;
      }
    }
    return null;
  }

  // Read runtime container by id from common PH runtime shapes
  function readRuntimeContainerById(id) {
    try {
      if (window.PHPlugins && PHPlugins.PHWarehouse) {
        var runtime = PHPlugins.PHWarehouse._warehouses || PHPlugins.PHWarehouse._containers || PHPlugins.PHWarehouse.warehouses || PHPlugins.PHWarehouse.containers;
        if (runtime) return runtime[id] || runtime[String(id)];
      }
    } catch (e) {}
    try {
      if (window.PHWarehouseManager) {
        var mgrProto = PHWarehouseManager.prototype;
        var runtime2 = mgrProto._warehouses || mgrProto.warehouses || mgrProto._containers || mgrProto.containers;
        if (runtime2) return runtime2[id] || runtime2[String(id)];
      }
    } catch (e) {}
    return null;
  }

  // Determine the storage unit name for a given Window_WarehouseItemList instance
  function detectStorageName(win) {
    if (!win) return null;

    // 1) If the window directly references a container object
    var objProps = ['_warehouse','_container','warehouse','container'];
    for (var i = 0; i < objProps.length; i++) {
      var p = objProps[i];
      if (win[p] && typeof win[p] === 'object') {
        var n = extractNameFromContainerObj(win[p]);
        if (n) return n;
      }
    }

    // 2) If the window has an id property, try to read runtime container by id
    var idProps = ['_warehouseId','_containerId','warehouseId','containerId'];
    for (var j = 0; j < idProps.length; j++) {
      var ip = idProps[j];
      if (typeof win[ip] !== 'undefined' && win[ip] !== null) {
        var id = win[ip];
        var obj = readRuntimeContainerById(id);
        if (obj) {
          var n2 = extractNameFromContainerObj(obj);
          if (n2) return n2;
        }
      }
    }

    // 3) If the window title/name contains a tag like "<Rings>" or "<Menu Category: Rings>"
    var titleProps = ['_title','_name','title','name','_windowName'];
    for (var k = 0; k < titleProps.length; k++) {
      var tp = titleProps[k];
      if (win[tp]) {
        var n3 = extractNameFromTagText(win[tp]);
        if (n3) return n3;
        // if the title is plain "Rings", accept it
        if (String(win[tp]).trim()) return String(win[tp]).trim();
      }
    }

    // 4) Scene-level current id fallback
    try {
      var sc = SceneManager._scene;
      if (sc) {
        var id = sc._currentWarehouseId || sc._selectedWarehouseId || sc._warehouseId || sc._containerId || sc._selectedContainerId;
        if (typeof id !== 'undefined' && id !== null) {
          var obj2 = readRuntimeContainerById(id);
          if (obj2) {
            var n4 = extractNameFromContainerObj(obj2);
            if (n4) return n4;
          }
        }
      }
    } catch (e) {}

    return null;
  }

  // Filter helper: remove items that do not contain the exact notetag
  function filterDataByStorageName(win) {
    try {
      var name = detectStorageName(win);
      if (!name) return false;
      var tag = buildExactNotetag(name);
      if (!Array.isArray(win._data)) return false;
      var before = win._data.length;
      win._data = win._data.filter(function(it) {
        return it && it.note && it.note.indexOf(tag) !== -1;
      });
      if (typeof win.select === 'function') win.select(0);
      else win._index = (win._data.length ? 0 : -1);
      return win._data.length !== before;
    } catch (e) {
      return false;
    }
  }

  // Apply wrappers to the Window_WarehouseItemList population points
  function applyFilterWrappers() {
    var W = window.Window_WarehouseItemList;
    if (!W || !W.prototype) return;

    // Wrap makeItemList (always present)
    if (!W.prototype._phmc_name_make_wrapped) {
      var _origMake = W.prototype.makeItemList;
      W.prototype.makeItemList = function() {
        _origMake.call(this);
        filterDataByStorageName(this);
      };
      W.prototype._phmc_name_make_wrapped = true;
    }

    // Wrap loadItems if present (some versions populate there)
    if (typeof W.prototype.loadItems === 'function' && !W.prototype._phmc_name_load_wrapped) {
      var _origLoad = W.prototype.loadItems;
      W.prototype.loadItems = function() {
        _origLoad.call(this);
        filterDataByStorageName(this);
      };
      W.prototype._phmc_name_load_wrapped = true;
    }

    // Wrap a few PH-specific helpers if they exist
    var helpers = ['makeWarehouseItemList','makeDepositAllItemList','makeDepositItemList','makeWarehouseContents'];
    helpers.forEach(function(name) {
      if (typeof W.prototype[name] === 'function' && !W.prototype['_phmc_name_' + name + '_wrapped']) {
        var _orig = W.prototype[name];
        W.prototype[name] = function() {
          _orig.call(this);
          filterDataByStorageName(this);
        };
        W.prototype['_phmc_name_' + name + '_wrapped'] = true;
      }
    });
  }

  // Initialize now or defer until boot
  if (window.Window_WarehouseItemList && Window_WarehouseItemList.prototype) {
    applyFilterWrappers();
  } else {
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
      _Scene_Boot_start.call(this);
      try { applyFilterWrappers(); } catch (e) { /* ignore */ }
    };
  }

  // Debug helper
  if (!window._PHWarehouseNameFilter) {
    window._PHWarehouseNameFilter = {
      detectStorageName: detectStorageName,
      filterDataByStorageName: filterDataByStorageName,
      buildExactNotetag: buildExactNotetag
    };
  }

  console.log('PH Warehouse: storage-name filtering plugin initialized.');
})();

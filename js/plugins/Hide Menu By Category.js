/*:
 * @plugindesc PH Warehouse: hide items in Window_WarehouseItemList unless they have the exact <Menu Category: NAME> notetag required by that storage unit.
 * @author Copilot
 * @help
 * Filters Window_WarehouseItemList._data so items without the exact notetag
 * "<Menu Category: NAME>" are not shown in that storage's list.
 */

(function() {
  'use strict';

  function buildExactNotetag(name) {
    return '<Menu Category: ' + name + '>';
  }

  function extractCategoryFromWarehouseObj(w) {
    if (!w) return null;
    if (w.menuCategory && String(w.menuCategory).trim()) return String(w.menuCategory).trim();
    if (w.category && String(w.category).trim()) return String(w.category).trim();
    var name = w.name || w.title || w.label || w._name || w._title;
    if (name) {
      var m = ('' + name).match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
      if (m && m[1]) return m[1].trim();
      var m2 = ('' + name).match(/<\s*([^:>]+?)\s*>/);
      if (m2 && m2[1]) return m2[1].trim();
    }
    if (typeof w.rule === 'string') {
      var r = w.rule.match(/Menu\s*Category\s*:\s*([^>\n\r]+)/i);
      if (r && r[1]) return r[1].trim();
    }
    if (Array.isArray(w.rules)) {
      for (var i = 0; i < w.rules.length; i++) {
        var rr = ('' + w.rules[i]).match(/Menu\s*Category\s*:\s*([^>\n\r]+)/i);
        if (rr && rr[1]) return rr[1].trim();
      }
    }
    if (w.rules && typeof w.rules === 'object') {
      if (w.rules.menuCategory) return String(w.rules.menuCategory).trim();
      if (w.rules.category) return String(w.rules.category).trim();
    }
    return null;
  }

  function readRuntimeWarehouseById(id) {
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

  function detectRequiredCategoryForWindow(win) {
    if (!win) return null;
    var idProps = ['_warehouseId','_containerId','warehouseId','containerId','_warehouse','_container'];
    for (var i = 0; i < idProps.length; i++) {
      var p = idProps[i];
      if (typeof win[p] !== 'undefined' && win[p] !== null) {
        var v = win[p];
        if (typeof v === 'object') {
          var cat = extractCategoryFromWarehouseObj(v);
          if (cat) return cat;
        } else {
          var wobj = readRuntimeWarehouseById(v);
          if (wobj) {
            var cat2 = extractCategoryFromWarehouseObj(wobj);
            if (cat2) return cat2;
          }
        }
      }
    }
    var titleProps = ['_title','_name','title','name','_windowName'];
    for (var j = 0; j < titleProps.length; j++) {
      var tp = titleProps[j];
      if (win[tp]) {
        var txt = '' + win[tp];
        var m = txt.match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
        if (m && m[1]) return m[1].trim();
        var m2 = txt.match(/<\s*([^:>]+?)\s*>/);
        if (m2 && m2[1]) return m2[1].trim();
      }
    }
    try {
      var sc = SceneManager._scene;
      if (sc) {
        var id = sc._currentWarehouseId || sc._selectedWarehouseId || sc._warehouseId || sc._containerId;
        if (typeof id !== 'undefined' && id !== null) {
          var w3 = readRuntimeWarehouseById(id);
          if (w3) {
            var cat3 = extractCategoryFromWarehouseObj(w3);
            if (cat3) return cat3;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function applyPatch() {
    var W = window.Window_WarehouseItemList;
    if (!W || !W.prototype) return;
    if (W.prototype._phmc_wrapped) return;

    var _orig = W.prototype.makeItemList;
    W.prototype.makeItemList = function() {
      _orig.call(this);
      try {
        var required = detectRequiredCategoryForWindow(this);
        if (!required) return;
        var tag = buildExactNotetag(required);
        if (!Array.isArray(this._data)) return;
        var before = this._data.length;
        this._data = this._data.filter(function(it){
          return it && it.note && it.note.indexOf(tag) !== -1;
        });
        if (typeof this.select === 'function') this.select(0);
        else this._index = (this._data.length ? 0 : -1);
      } catch (e) {
        // do not break the UI
        console.warn('PH filter error in makeItemList', e);
      }
    };

    W.prototype._phmc_wrapped = true;
  }

  if (window.Window_WarehouseItemList && Window_WarehouseItemList.prototype) {
    applyPatch();
  } else {
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
      _Scene_Boot_start.call(this);
      try { applyPatch(); } catch (e) { console.warn('PH filter deferred patch failed', e); }
    };
  }

  // runtime helper for debugging
  if (!window._PHWarehouseMenuCategoryFilter) {
    window._PHWarehouseMenuCategoryFilter = {
      detectForWindow: detectRequiredCategoryForWindow,
      readRuntimeWarehouseById: readRuntimeWarehouseById,
      buildExactNotetag: buildExactNotetag
    };
  }
})();

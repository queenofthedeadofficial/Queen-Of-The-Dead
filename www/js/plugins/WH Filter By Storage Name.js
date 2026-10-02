/*:
 * @plugindesc PH Warehouse inventory filter — destructive, tolerant, and embeds an All-Items deposit list inside the warehouse UI. Place after PH_Warehouse, YEP_ItemCore, ItemsSort.
 * @author Copilot (patched)
 *
 * @param ForceHide
 * @text Force hide without tag
 * @type boolean
 * @default true
 *
 * @param Debug
 * @text Debug logging
 * @type boolean
 * @default false
 *
 * @help
 * - Use plugin command: PHWarehouse show <Name>
 * - Or call: $gameSystem.setPHLastWarehouseName('Bracelets')
 * - Deposit OK opens an embedded full-items list in the same box; selecting OK deposits via the warehouse handler.
 */

(function() {
  'use strict';

  var PLUGIN_NAME = 'WH Filter By Storage Name';
  var params = PluginManager.parameters ? PluginManager.parameters(PLUGIN_NAME) : {};
  var FORCE_HIDE = (params.ForceHide === 'true' || params.ForceHide === true);
  var DEBUG = (params.Debug === 'true' || params.Debug === true);

  /* -------------------------
     Game_System helpers
     ------------------------- */
  if (!Game_System.prototype.setPHLastWarehouseName) {
    Game_System.prototype.setPHLastWarehouseName = function(name) { this._phLastWarehouseName = name ? String(name) : null; };
  }
  if (!Game_System.prototype.clearPHLastWarehouseName) {
    Game_System.prototype.clearPHLastWarehouseName = function() { this._phLastWarehouseName = null; };
  }
  if (!Game_System.prototype.getPHLastWarehouseName) {
    Game_System.prototype.getPHLastWarehouseName = function() { return this._phLastWarehouseName || null; };
  }

  /* -------------------------
     Capture plugin command
     ------------------------- */
  var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    try {
      if (!command) return;
      var cmd = String(command).trim();
      if (cmd.toLowerCase() === 'phwarehouse') {
        if (args && args.length > 0) {
          var sub = String(args[0] || '').toLowerCase();
          if (sub === 'show' && args.length >= 2) {
            var raw = args.slice(1).join(' ').trim();
            var m = raw.match(/<\s*([^>]+?)\s*>/);
            var name = m ? m[1].trim() : raw;
            if (name && $gameSystem) {
              $gameSystem.setPHLastWarehouseName(name);
              if (DEBUG) console.log('PHWarehouse captured storage name:', name);
            }
          }
        }
      }
    } catch (e) { if (DEBUG) console.warn('PHWarehouse capture error', e); }
  };

  /* -------------------------
     Utilities
     ------------------------- */
  function detectCapturedStorageName() {
    return $gameSystem && $gameSystem.getPHLastWarehouseName ? $gameSystem.getPHLastWarehouseName() : null;
  }
  function isWarehouseSceneActive() {
    var sc = SceneManager._scene;
    if (!sc) return false;
    var name = sc.constructor && sc.constructor.name;
    return !!name && (name === 'Scene_Warehouse' || name.toLowerCase().indexOf('warehouse') !== -1);
  }

  /* -------------------------
     Resolver and tolerant matcher
     ------------------------- */
  function PH_resolveDbObject(entry) {
    if (!entry) return null;
    try {
      if (typeof entry.object === 'function') { var o = entry.object(); if (o) return o; }
      if (typeof entry.item === 'function') { var it = entry.item(); if (it) return it; }
    } catch (e) {}
    var cand = entry.object || entry.item || entry._item || entry.data || entry.payload || entry;
    if (cand && (cand.meta || cand.note || cand.params || cand.description || cand.etypeId || cand.iconIndex)) return cand;
    if (entry && typeof entry.kind === 'number' && typeof entry.id === 'number') {
      if (entry.kind === 0 && $dataItems && $dataItems[entry.id]) return $dataItems[entry.id];
      if (entry.kind === 1 && $dataWeapons && $dataWeapons[entry.id]) return $dataWeapons[entry.id];
      if (entry.kind === 2 && $dataArmors && $dataArmors[entry.id]) return $dataArmors[entry.id];
    }
    if (entry && typeof entry.itemId === 'number' && $dataItems && $dataItems[entry.itemId]) return $dataItems[entry.itemId];
    if (entry && typeof entry.id === 'number') {
      if ($dataItems && $dataItems[entry.id]) return $dataItems[entry.id];
      if ($dataWeapons && $dataWeapons[entry.id]) return $dataWeapons[entry.id];
      if ($dataArmors && $dataArmors[entry.id]) return $dataArmors[entry.id];
    }
    var rawName = (cand && cand.name) || (entry && entry.name) || null;
    if (rawName && typeof rawName === 'string') {
      var name = rawName.trim().replace(/^"+|"+$/g,'').replace(/^'+|'+$/g,'').trim();
      if (name) {
        var found = ($dataItems||[]).find(x=>x&&x.name===name) || ($dataWeapons||[]).find(x=>x&&x.name===name) || ($dataArmors||[]).find(x=>x&&x.name===name);
        if (found) return found;
      }
    }
    if ($gameParty && typeof $gameParty.allItems === 'function') {
      var list = $gameParty.allItems();
      for (var i=0;i<list.length;i++){
        var li = list[i];
        var ln = (li && (li.name || (li.item && li.item.name) || (li.object && li.object.name))) || '';
        if (ln && rawName && String(ln).trim() === String(rawName).trim()) {
          var dbcand = (li && (li.item || li.object || li.data)) || li;
          if (dbcand && (dbcand.meta || dbcand.note || dbcand.name)) return dbcand;
        }
      }
    }
    return null;
  }

  function tokensFromRaw(raw) {
    if (!raw || typeof raw !== 'string') return [];
    return raw.split(',').map(function(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/_/g,' '); }).filter(Boolean);
  }

  function PH_matchesMenuCategory(entry, capturedName) {
    if (!capturedName) return true;
    var db = PH_resolveDbObject(entry);
    var want = String(capturedName).trim().toLowerCase();

    if (db) {
      if (db.note) {
        var reAll = /<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/ig;
        var m;
        while ((m = reAll.exec(db.note)) !== null) {
          var toks = tokensFromRaw(m[1]);
          if (toks.indexOf(want) !== -1) return true;
        }
      }
      var keys = db.meta ? Object.keys(db.meta) : [];
      for (var i=0;i<keys.length;i++){
        var k = String(keys[i]).trim().toLowerCase().replace(/\s+/g,' ');
        if (k === 'menu category' || k === 'menucategory' || k === 'menu_category') {
          var toks = tokensFromRaw(String(db.meta[keys[i]] || ''));
          if (toks.indexOf(want) !== -1) return true;
        }
      }
      if (String(db.name || '').trim().toLowerCase() === want) return true;
      return false;
    }

    var fallbackName = (entry && (entry.name || (entry.item && entry.item.name) || (entry.object && entry.object.name))) || '';
    return String(fallbackName).trim().toLowerCase() === want;
  }

  /* -------------------------
     Destructive filter
     ------------------------- */
  function filterWindowDataForCapturedName(win) {
    try {
      if (!win || !Array.isArray(win._data)) return false;
      if (!isWarehouseSceneActive()) return false;
      var captured = detectCapturedStorageName();
      if (!captured) return false;

      var source = win._data.slice(0);
      if (!source.length && $gameParty && typeof $gameParty.allItems === 'function') source = $gameParty.allItems().slice();

      var filtered = source.filter(function(it){ return PH_matchesMenuCategory(it, captured); });

      if (FORCE_HIDE) {
        win._data = filtered;
      } else {
        win._data = filtered.length ? filtered : source;
      }

      if (typeof win.select === 'function') {
        win.select(win._data.length ? 0 : -1);
      } else {
        win._index = (win._data.length ? 0 : -1);
      }

      if (DEBUG) {
        console.log('PH filter debug: captured=', captured, 'sourceCount=', source.length, 'filteredCount=', filtered.length, 'forceHide=', FORCE_HIDE);
        filtered.forEach(function(it){ var db = PH_resolveDbObject(it); console.log('  keep:', db && db.name ? db.name : (it && it.name) || '(no name)'); });
        source.filter(function(it){ return !PH_matchesMenuCategory(it, captured); }).forEach(function(it){ var db = PH_resolveDbObject(it); console.log('  hide:', db && db.name ? db.name : (it && it.name) || '(no name)'); });
      }

      return true;
    } catch (e) { if (DEBUG) console.warn('PH filter error', e); return false; }
  }

  /* -------------------------
     Embedded All-Items window for warehouse
     ------------------------- */
  function Window_WarehouseAllItems() {
    this.initialize.apply(this, arguments);
  }
  Window_WarehouseAllItems.prototype = Object.create(Window_ItemList.prototype);
  Window_WarehouseAllItems.prototype.constructor = Window_WarehouseAllItems;

  Window_WarehouseAllItems.prototype.initialize = function(x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
    this._ph_depositCallback = null;
    this.refresh();
  };

  Window_WarehouseAllItems.prototype.makeItemList = function() {
    this._data = $gameParty.allItems().slice();
  };

  Window_WarehouseAllItems.prototype.setDepositCallback = function(cb) {
    this._ph_depositCallback = typeof cb === 'function' ? cb : null;
  };

  Window_WarehouseAllItems.prototype.processOk = function() {
    var index = this.index();
    var entry = this._data && this._data[index];
    var db = (window._PHWarehouseNameFilter && window._PHWarehouseNameFilter.PH_resolveDbObject) ? window._PHWarehouseNameFilter.PH_resolveDbObject(entry) : entry;
    if (this._ph_depositCallback) {
      try { this._ph_depositCallback(db, entry); } catch (e) { if (DEBUG) console.warn('Warehouse deposit callback error', e); }
    }
    Window_ItemList.prototype.processOk.call(this);
  };

  function createWarehouseAllItemsWindow(scene) {
    var targetWin = scene && (scene._itemWindow || scene._warehouseWindow || scene._contentsWindow || scene._storageWindow);
    var wx = 0, wy = scene.mainAreaTop ? scene.mainAreaTop() : 0, ww = Graphics.boxWidth, wh = Graphics.boxHeight - wy;
    if (targetWin) {
      wx = targetWin.x || 0;
      wy = targetWin.y || 0;
      ww = (typeof targetWin.width === 'number') ? targetWin.width : (Graphics.boxWidth - wx);
      wh = (typeof targetWin.height === 'number') ? targetWin.height : (Graphics.boxHeight - wy);
    }
    return new Window_WarehouseAllItems(wx, wy, ww, wh);
  }

  /* -------------------------
     Add open/close methods to Scene_Warehouse
     ------------------------- */
  if (typeof Scene_Warehouse !== 'undefined' && Scene_Warehouse.prototype && !Scene_Warehouse.prototype._phmc_allitems_embedded) {
    Scene_Warehouse.prototype.openWarehouseAllItems = function() {
      if (this._ph_allItemsWindow) {
        this._ph_allItemsWindow.activate();
        return;
      }
      this._ph_allItemsWindow = createWarehouseAllItemsWindow(this);
      this._ph_allItemsWindow.setHandler('ok', this._ph_onAllItemsOk.bind(this));
      this._ph_allItemsWindow.setHandler('cancel', this._ph_onAllItemsCancel.bind(this));
      var depositCallback = (function(dbObj, runtimeEntry){
        try {
          if (typeof this.onWarehouseDepositSelected === 'function') { this.onWarehouseDepositSelected(dbObj, runtimeEntry); return; }
          if (typeof this.depositSelectedItem === 'function') { this.depositSelectedItem(dbObj, runtimeEntry); return; }
          if (window.PH_Warehouse && typeof window.PH_Warehouse.depositItem === 'function') { window.PH_Warehouse.depositItem(dbObj, runtimeEntry); return; }
          if (dbObj && dbObj.id && $gameParty && typeof $gameParty.loseItem === 'function') { $gameParty.loseItem(dbObj, 1); if (DEBUG) console.log('PH fallback deposit: removed one', dbObj.name); return; }
          if (DEBUG) console.warn('PH deposit fallback: no deposit API found; item not deposited', dbObj);
        } catch (e) { if (DEBUG) console.warn('PH deposit callback error', e); }
      }).bind(this);
      this._ph_allItemsWindow.setDepositCallback(depositCallback);
      this.addWindow(this._ph_allItemsWindow);
      this._ph_allItemsWindow.refresh();
      this._ph_allItemsWindow.activate();
    };

    Scene_Warehouse.prototype.closeWarehouseAllItems = function() {
      if (this._ph_allItemsWindow) {
        this.removeChild(this._ph_allItemsWindow);
        this._ph_allItemsWindow = null;
      }
      var targetWin = this._itemWindow || this._warehouseWindow || this._contentsWindow || this._storageWindow;
      if (targetWin && typeof targetWin.activate === 'function') targetWin.activate();
    };

    Scene_Warehouse.prototype._ph_onAllItemsOk = function() {
      this.closeWarehouseAllItems();
    };

    Scene_Warehouse.prototype._ph_onAllItemsCancel = function() {
      this.closeWarehouseAllItems();
    };

    Scene_Warehouse.prototype._phmc_allitems_embedded = true;
  }

  /* -------------------------
     Wrap deposit window OK to open embedded list (only when that window is the warehouse deposit window)
     ------------------------- */
  function wrapDepositOkToOpenEmbedded() {
    var WW = window.Window_WarehouseItemList;
    var WI = window.Window_ItemList;
    var targets = [];
    if (WW && WW.prototype) targets.push({proto: WW.prototype, name: 'Window_WarehouseItemList'});
    if (WI && WI.prototype) targets.push({proto: WI.prototype, name: 'Window_ItemList'});

    targets.forEach(function(t){
      var proto = t.proto;
      if (!proto._phmc_open_embedded_wrapped) {
        var origProcessOk = proto.processOk;
        proto.processOk = function() {
          try {
            var scene = SceneManager._scene;
            var sceneName = scene && scene.constructor && scene.constructor.name;
            var isWarehouse = !!sceneName && (sceneName === 'Scene_Warehouse' || sceneName.toLowerCase().indexOf('warehouse') !== -1);
            // Only intercept if this window instance is the deposit/contents window used by the warehouse scene
            if (isWarehouse && scene) {
              var depositWindowInstances = [scene._itemWindow, scene._warehouseWindow, scene._contentsWindow, scene._storageWindow];
              // If this window instance is one of the warehouse's deposit windows, open embedded list
              if (depositWindowInstances.indexOf(this) !== -1 && typeof scene.openWarehouseAllItems === 'function') {
                scene.openWarehouseAllItems();
                return;
              }
            }
          } catch (e) { if (DEBUG) console.warn('PH open embedded wrapper error', e); }
          if (typeof origProcessOk === 'function') origProcessOk.call(this);
        };
        proto._phmc_open_embedded_wrapped = true;
      }
    });
  }

  if ((window.Window_ItemList && Window_ItemList.prototype) || (window.Window_WarehouseItemList && Window_WarehouseItemList.prototype)) {
    wrapDepositOkToOpenEmbedded();
  } else {
    var _Scene_Boot_start_ph = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
      _Scene_Boot_start_ph.call(this);
      try { wrapDepositOkToOpenEmbedded(); } catch(e){ if (DEBUG) console.warn(e); }
    };
  }

  // Expose helpers for debugging
  if (!window._PHWarehouseNameFilter) window._PHWarehouseNameFilter = {};
  window._PHWarehouseNameFilter.detectCapturedStorageName = detectCapturedStorageName;
  window._PHWarehouseNameFilter.PH_resolveDbObject = PH_resolveDbObject;
  window._PHWarehouseNameFilter.PH_matchesMenuCategory = PH_matchesMenuCategory;
  window._PHWarehouseNameFilter.filterWindowDataForCapturedName = filterWindowDataForCapturedName;
  window._PHWarehouseNameFilter.DEBUG = DEBUG;

  console.log('PH Warehouse inventory filter initialized. ForceHide=', FORCE_HIDE, 'Debug=', DEBUG);
})();

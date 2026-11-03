/*:
 * @plugindesc PH Warehouse Use Scene_Item list window adapter. Reuses Window_ItemList UI and draws quantities. Place after PH_Warehouse and your sorter plugin.
 * @author You
 * @help
 * Replaces the warehouse item list window with a Window_ItemList-based adapter that
 * draws quantities and routes selection to PH_Warehouse manager.
 */
(function(){
  'use strict';

  // Safety checks
  if (!window.PHPlugins || !PHPlugins.PHWarehouse) {
    console.warn("PH_Warehouse not found. PH_WarehouseUseSceneItem plugin will not initialize.");
    return;
  }
  if (!window.Window_ItemList) {
    console.warn("Window_ItemList not found. PH_WarehouseUseSceneItem plugin will not initialize.");
    return;
  }

  // Subclass Window_ItemList to draw quantities and accept a custom list
  function Window_WarehouseItemAdapter() {
    this.initialize.apply(this, arguments);
  }
  Window_WarehouseItemAdapter.prototype = Object.create(Window_ItemList.prototype);
  Window_WarehouseItemAdapter.prototype.constructor = Window_WarehouseItemAdapter;

  Window_WarehouseItemAdapter.prototype.initialize = function(x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
    this._warehouseQuantities = {}; // id -> qty
    this._warehouseIds = []; // preserve id order if needed
  };

  // Accept an array of wrapper objects: { item: DBobj, id: number, quantity: number }
  Window_WarehouseItemAdapter.prototype.setWarehouseList = function(wrapperList) {
    // If Window_ItemList expects DB objects, we set its internal item list accordingly
    var dbList = wrapperList.map(function(w){ return w && w.item; }).filter(Boolean);
    // store quantities by id for drawing
    var qmap = {};
    var ids = [];
    wrapperList.forEach(function(w){
      if (!w) return;
      qmap[w.id] = w.quantity || 0;
      ids.push(w.id);
    });
    this._warehouseQuantities = qmap;
    this._warehouseIds = ids;
    // set the internal item list used by Window_ItemList
    this._data = dbList;
    // call refresh to redraw
    this.refresh();
  };

  // Override drawItem to include quantity on the right
  var _ph_drawItem = Window_WarehouseItemAdapter.prototype.drawItem;
  Window_WarehouseItemAdapter.prototype.drawItem = function(index) {
    // call original to draw icon + name
    _ph_drawItem.call(this, index);

    // draw quantity aligned to the right
    var item = this._data[index];
    if (!item) return;
    // find id for this item: try to match by id in stored ids
    var id = item.id || (item && item.itemId) || null;
    // fallback: try to find by name if id missing
    if (!id) {
      for (var i=0;i<this._data.length;i++){
        if (this._data[i] === item && this._warehouseIds[i]) { id = this._warehouseIds[i]; break; }
      }
    }
    var qty = (id !== null && id !== undefined) ? (this._warehouseQuantities[id] || 0) : 0;
    var rect = this.itemRectForText(index);
    var width = this.innerWidth - this.textPadding();
    var qtyText = "×" + qty;
    this.resetTextColor();
    this.drawText(qtyText, rect.x, rect.y, width, 'right');
  };

  // Helper: build wrapper list from PH manager for a category
  function buildWrapperListForCategory(manager, warehouseTitle, category) {
    var wh = manager._warehouses && manager._warehouses[warehouseTitle];
    if (!wh) return [];
    var ids = (wh.items && wh.items[category]) ? wh.items[category].slice() : [];
    var qmap = (wh.qtty && wh.qtty[category]) ? wh.qtty[category] : {};
    var list = ids.map(function(id){
      var db = (category === 'weapon') ? $dataWeapons[id] :
               (category === 'armor')  ? $dataArmors[id]  :
                                        $dataItems[id];
      return { item: db, id: id, quantity: qmap[id] || 0 };
    }).filter(function(w){ return w && w.item; });
    // If you already have a sorter plugin that sorts Window_ItemList, it will run.
    // But we still sort here alphabetically to be safe
    list.sort(function(a,b){
      var na = a.item && a.item.name ? String(a.item.name) : '';
      var nb = b.item && b.item.name ? String(b.item.name) : '';
      var c = na.localeCompare(nb);
      return c !== 0 ? c : (a.id - b.id);
    });
    return list;
  }

  // Patch Scene_PHWarehouse to replace its item list window creation
  // We try to find the method that creates the list window. Common names: createCommandWindow, createListWindow, createItemWindow
  var sceneProto = Scene_Menu.prototype; // fallback; we'll search for Scene that contains createCommandWindow used earlier
  // Find the actual PH scene object by scanning global constructors
  var PHScene = null;
  for (var k in window) {
    try {
      var C = window[k];
      if (typeof C === 'function' && C.prototype && C.prototype.createCommandWindow && C.prototype.create) {
        // skip Scene_Menu and Scene_Item
        if (k === 'Scene_Item' || k === 'Scene_Menu') continue;
        // Heuristic: PH scenes often have createCommandWindow patched; check for PH-specific method names
        if (C.prototype.createCommandWindow.toString().indexOf('PH') >= 0 || C.prototype.create.toString().indexOf('PH') >= 0) {
          PHScene = C;
          break;
        }
      }
    } catch(e){}
  }
  // If we couldn't find a PH-specific scene, try to find a scene that references PHPlugins.PHWarehouse in its prototype
  if (!PHScene) {
    for (var k2 in window) {
      try {
        var C2 = window[k2];
        if (typeof C2 === 'function' && C2.prototype) {
          var src = C2.prototype.create && C2.prototype.create.toString();
          if (src && src.indexOf('PHWarehouse') >= 0 || (src && src.indexOf('PH_Warehouse') >= 0)) {
            PHScene = C2;
            break;
          }
        }
      } catch(e){}
    }
  }
  // If still not found, fallback to patching any scene that contains a window with _data referencing PH manager
  function patchScenePrototype(proto) {
    if (!proto || proto._ph_warehouse_adapter_installed) return;
    proto._ph_warehouse_adapter_installed = true;

    var origCreate = proto.create;
    proto.create = function() {
      if (typeof origCreate === 'function') origCreate.call(this);
      try {
        // find the list window instance in this scene
        var win = null;
        for (var k in this) {
          try {
            var obj = this[k];
            if (obj && obj._data && typeof obj.maxCols === 'function' && typeof obj.refresh === 'function') {
              // Heuristic: check if its data items come from PH manager
              var sample = obj._data[0];
              if (sample && sample.id && PHPlugins.PHWarehouse._warehouses && PHPlugins.PHWarehouse._warehouses[PHPlugins.PHWarehouse._lastActive]) {
                win = obj;
                break;
              }
            }
          } catch(e){}
        }
        // fallback: search window layer children
        if (!win && this._windowLayer && this._windowLayer.children) {
          this._windowLayer.children.forEach(function(c){
            if (!win && c && c._data && typeof c.maxCols === 'function' && typeof c.refresh === 'function') win = c;
          });
        }
        if (!win) return;

        // Replace instance with our adapter instance (preserve geometry)
        var x = win.x || 0;
        var y = win.y || 0;
        var w = win.width || win.windowWidth && win.windowWidth() || Graphics.boxWidth;
        var h = win.height || win.windowHeight && win.windowHeight() || Graphics.boxHeight;
        var adapter = new Window_WarehouseItemAdapter(x, y, w, h);

        // copy selection handlers if present
        if (win.setHandler) {
          // copy handlers (ok/cancel) to adapter
          try {
            adapter._handlers = win._handlers || {};
            for (var key in adapter._handlers) {
              if (win._handlers && win._handlers[key]) adapter.setHandler(key, win._handlers[key]);
            }
          } catch(e){}
        }

        // replace reference on scene
        for (var k3 in this) {
          if (this[k3] === win) this[k3] = adapter;
        }
        // also replace in window layer children
        if (this._windowLayer && this._windowLayer.children) {
          for (var i=0;i<this._windowLayer.children.length;i++){
            if (this._windowLayer.children[i] === win) this._windowLayer.children[i] = adapter;
          }
        }

        // initial populate using PH manager
        var mgr = PHPlugins.PHWarehouse;
        var active = mgr._lastActive;
        var cat = mgr._lastCategory || 'item';
        var list = buildWrapperListForCategory(mgr, active, cat);
        adapter.setWarehouseList(list);

        // wire selection to PH manager deposit/withdraw
        adapter.setHandler('ok', function(){
          var index = adapter.index();
          var dbItem = adapter._data[index];
          if (!dbItem) return;
          // find id by matching name+id in adapter._warehouseQuantities
          var id = null;
          for (var i=0;i<adapter._data.length;i++){
            if (adapter._data[i] === dbItem && adapter._warehouseIds[i]) { id = adapter._warehouseIds[i]; break; }
          }
          if (id === null) return;
          // call PH manager withdraw or deposit depending on context
          // If PH scene expects withdraw on ok, call withdraw; otherwise call deposit. We attempt withdraw first.
          try {
            mgr.withdraw({ id: id });
          } catch(e) {
            try { mgr.deposit({ id: id }); } catch(e2) {}
          }
          // refresh adapter list after mutation
          var newList = buildWrapperListForCategory(mgr, mgr._lastActive, mgr._lastCategory || 'item');
          adapter.setWarehouseList(newList);
        });

        // ensure adapter refreshes when scene updates (simple hook)
        var origUpdate = this.update;
        this.update = function() {
          origUpdate.call(this);
          // keep adapter in sync if PH manager changed
          try {
            var newList2 = buildWrapperListForCategory(PHPlugins.PHWarehouse, PHPlugins.PHWarehouse._lastActive, PHPlugins.PHWarehouse._lastCategory || 'item');
            // quick compare length or first id to avoid heavy updates
            if (newList2.length !== adapter._data.length || (newList2[0] && adapter._data[0] && newList2[0].id !== adapter._data[0].id)) {
              adapter.setWarehouseList(newList2);
            }
          } catch(e){}
        };

      } catch(e) {
        console.error("PH Warehouse adapter create patch error:", e);
      }
    };
  }

  // Try to patch the PH scene prototype if found, otherwise patch Scene_Menu and Scene_Map as fallback so the adapter installs when the PH scene opens
  if (PHScene && PHScene.prototype) {
    patchScenePrototype(PHScene.prototype);
    console.log("PH_WarehouseUseSceneItem: patched PH scene prototype:", PHScene.name || PHScene);
  } else {
    // fallback: patch Scene_Menu and Scene_Map so when PH scene is created the adapter can find and replace the window instance
    patchScenePrototype(Scene_Menu.prototype);
    patchScenePrototype(Scene_Map.prototype);
    console.log("PH_WarehouseUseSceneItem: PH scene not found by name; patched fallback scene prototypes.");
  }

})();

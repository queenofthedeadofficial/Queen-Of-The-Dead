/*:
 * @plugindesc QuickSynthesis MultiCraft UI — bottom dialog + grid quantity selector for recipes. Place below QuickSynthesis. v1.01
 * @author Generated (patched)
 * @help
 * - Triggers when a recipe has a <Synthesis Materials: ...> tag and the party has at least 2 of each material.
 * - Opens a bottom dialog: "Craft how many [name]? Up to X."
 * - Shows a grid selector (0..X). Choosing 0 or Cancel returns to the list. Choosing N consumes N of each material and gives N of the product, then shows "Crafted N [name]."
 * - Does not modify QuickSynthesis core logic; it installs instance handlers on recipe-list windows.
 * - IMPORTANT: This version passes the list instance into QuickSynthesis.openCraftQuantityPrompt(rec, materials, product, onDone, ownerList)
 *   and restores/activates the list when the prompt returns qty === 0 so the synthesis menu remains open on Cancel.
 */

(function(){
  'use strict';

  var PLUGIN_NAME = 'QuickSynthesis_MultiCraft_UI';
  var DEBUG = false;

  // -------------------------
  // UI Windows
  // -------------------------

  function Window_CraftPrompt() {
    this.initialize.apply(this, arguments);
  }
  Window_CraftPrompt.prototype = Object.create(Window_Base.prototype);
  Window_CraftPrompt.prototype.constructor = Window_CraftPrompt;
  Window_CraftPrompt.prototype.initialize = function() {
    var height = 88;
    Window_Base.prototype.initialize.call(this, 0, Graphics.boxHeight - height, Graphics.boxWidth, height);
    this._text = '';
    this.refresh();
  };
  Window_CraftPrompt.prototype.setText = function(text) {
    this._text = text || '';
    this.refresh();
  };
  Window_CraftPrompt.prototype.refresh = function() {
    this.contents.clear();
    this.drawTextEx(this._text, 12, 12);
  };

  function Window_CraftGrid() {
    this.initialize.apply(this, arguments);
  }
  Window_CraftGrid.prototype = Object.create(Window_Selectable.prototype);
  Window_CraftGrid.prototype.constructor = Window_CraftGrid;
  Window_CraftGrid.prototype.initialize = function(x, y, width, height, max) {
    this._max = Math.max(0, Math.floor(max || 0));
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
    this.select(0);
    this.activate();
  };
  Window_CraftGrid.prototype.maxItems = function() {
    return this._max + 1;
  };
  Window_CraftGrid.prototype.item = function(index) {
    return index;
  };
  Window_CraftGrid.prototype.drawItem = function(index) {
    var rect = this.itemRectForText(index);
    var text = String(index);
    this.drawText(text, rect.x, rect.y, rect.width, 'center');
  };
  Window_CraftGrid.prototype.refresh = function() {
    this.createContents();
    var total = this._max + 1;
    for (var i = 0; i < total; i++) {
      this.drawItem(i);
    }
  };
  Window_CraftGrid.prototype.standardPadding = function() { return 12; };
  Window_CraftGrid.prototype.itemRectForText = function(index) {
    var ww = this.contents.width;
    var perRow = Math.max(1, Math.floor(ww / 64));
    var w = Math.floor(ww / perRow);
    var h = this.lineHeight();
    var col = index % perRow;
    var row = Math.floor(index / perRow);
    return { x: col * w, y: row * h, width: w, height: h };
  };

  // -------------------------
  // Helpers
  // -------------------------

  function parseMaterialsFromNote(note) {
    var out = [];
    if (!note) return out;
    var m = note.match(/<\s*Synthesis\s+Materials\s*:\s*([^>]+)>/i);
    if (!m) return out;
    var list = m[1].split(',');
    for (var i = 0; i < list.length; i++) {
      var part = list[i].trim();
      var mm = part.match(/(\d+)\s*x\s*(\d+)/i) || part.match(/(\d+)\s+(\d+)/i);
      if (mm) {
        var id = parseInt(mm[1], 10);
        var qty = parseInt(mm[2], 10);
        if (!isNaN(id) && !isNaN(qty) && qty > 0) out.push({ id: id, qty: qty });
      }
    }
    return out;
  }

  function minMaterialCount(materials) {
    if (!Array.isArray(materials) || materials.length === 0) return 0;
    var min = Infinity;
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var it = $dataItems[m.id];
      var c = it ? $gameParty.numItems(it) : 0;
      if (c < min) min = c;
    }
    return (min === Infinity) ? 0 : min;
  }

  // Expose prompt function so other code can call it
  // NOTE: This function signature now supports ownerList as the 5th parameter.
  function openCraftQuantityPrompt(rec, materials, product, onDone, ownerList) {
    var scene = SceneManager._scene;
    if (!scene) { if (onDone) onDone(0); return; }
    var max = minMaterialCount(materials);
    if (max <= 1) { if (onDone) onDone(0); return; }

    // Create windows
    var prompt = new Window_CraftPrompt();
    var gridHeight = Math.min(200, Graphics.boxHeight * 0.35);
    var gridY = Graphics.boxHeight - prompt.height - gridHeight - 8;
    var grid = new Window_CraftGrid(12, gridY, Graphics.boxWidth - 24, gridHeight, max);

    scene.addWindow(prompt);
    scene.addWindow(grid);

    var name = product && product.name ? product.name : (rec && rec.item && rec.item.name ? rec.item.name : 'item');
    prompt.setText('\\C[0]Craft how many ' + name + '? Up to ' + String(max) + '.');

    // Input handling
    var cleanup = function() {
      try { if (prompt && prompt.parent) prompt.parent.removeChild(prompt); } catch(e){}
      try { if (grid && grid.parent) grid.parent.removeChild(grid); } catch(e){}
    };

    // Hook grid input
    grid.update = (function(orig){
      return function() {
        orig.call(this);
        if (this.active) {
          if (Input.isTriggered('ok')) {
            var val = this.index();
            cleanup();
            if (onDone) onDone(val);
          } else if (Input.isTriggered('cancel')) {
            cleanup();
            if (onDone) onDone(0);
          }
        }
      };
    })(grid.update.bind(grid));

    grid.onTouchOk = function() {
      var idx = this.index();
      cleanup();
      if (onDone) onDone(idx);
    };

    grid.activate();
    grid.select(0);
  }

  // Expose on global QuickSynthesis object
  window.QuickSynthesis = window.QuickSynthesis || {};
  window.QuickSynthesis.openCraftQuantityPrompt = openCraftQuantityPrompt;

  // -------------------------
  // Instance installer
  // -------------------------

  function installOnListInstance(list) {
    try {
      if (!list || typeof list.setHandler !== 'function') return false;
      if (list._qs_multiPatchedInstance) return true;

      // Save original ok handler if present
      list._origOkHandler = list._handlers && list._handlers['ok'] ? list._handlers['ok'] : null;

      var wrapper = function() {
        try {
          var rec = (typeof this.item === 'function') ? this.item() : (this._data && this._data[this.index()]);
          if (!rec) return this._origOkHandler && this._origOkHandler();

          var note = (rec && rec.item && rec.item.note) ? rec.item.note : (rec && rec.note) || '';
          if (!note || !/<\s*Synthesis\s+Materials\s*:/i.test(note)) return this._origOkHandler && this._origOkHandler();

          var mats = Array.isArray(rec.materials) ? rec.materials : parseMaterialsFromNote(note);
          if (!Array.isArray(mats) || mats.length === 0) return this._origOkHandler && this._origOkHandler();

          var min = minMaterialCount(mats);
          if (min >= 2) {
            var productId = rec.id || (rec.item && rec.item.id) || null;
            var product = productId && $dataItems[productId] ? $dataItems[productId] : (rec.item && rec.item.id && $dataItems[rec.item.id] ? $dataItems[rec.item.id] : null);

            // IMPORTANT: pass the list instance as the ownerList so integrations can manage modal state
            openCraftQuantityPrompt(rec, mats, product, function(qty){
              // qty === 0 means Cancel or chose 0: restore and return to synthesis list
              if (!qty || qty <= 0) {
                try {
                  // restore and reactivate the list so the synthesis menu remains visible
                  if (list) {
                    try { list.refresh && list.refresh(); } catch(e){}
                    try { list.activate && list.activate(); } catch(e){}
                    try { list.select && list.select(0); } catch(e){}
                    try { list.active = true; } catch(e){}
                  }
                } catch(e){}
                return;
              }

              // perform crafting for qty > 0
              for (var i = 0; i < mats.length; i++) {
                var m = mats[i];
                var it = $dataItems[m.id];
                if (it) $gameParty.loseItem(it, qty, false);
              }
              if (product) $gameParty.gainItem(product, qty, false);
              $gameMessage.add('Crafted ' + qty + ' ' + (product && product.name ? product.name : 'item') + '.');
              try { if (list.refresh) list.refresh(); } catch(e){}
            }, list); // <-- pass ownerList here

            return;
          }
        } catch (e) {
          if (DEBUG) console.error('MultiCraft wrapper error', e);
        }
        return this._origOkHandler && this._origOkHandler();
      }.bind(list);

      // Install wrapper as ok handler
      try {
        list.setHandler && list.setHandler('ok', wrapper);
        list._handlers = list._handlers || {};
        list._handlers['ok'] = wrapper;
        list._qs_multiPatchedInstance = true;
        if (DEBUG) console.log(PLUGIN_NAME + ': installed multi-craft wrapper on', list.constructor && list.constructor.name);
        // Also patch processOk if it's an own property so internal calls trigger wrapper
        if (list.hasOwnProperty('processOk')) {
          list._orig_processOk = list.processOk;
          list.processOk = function() { try { wrapper(); } catch(e){ if (this._orig_processOk) return this._orig_processOk.apply(this, arguments); } };
          if (DEBUG) console.log(PLUGIN_NAME + ': patched instance.processOk to call wrapper');
        }
      } catch (e) {
        if (DEBUG) console.error(PLUGIN_NAME + ': failed to install wrapper', e);
      }
      return true;
    } catch (e) {
      if (DEBUG) console.error(PLUGIN_NAME + ': installOnListInstance error', e);
      return false;
    }
  }

  // Install on scene candidate windows
  function installOnScene(scene) {
    if (!scene) return;
    var candidates = [ '_list', '_recipeList', '_itemWindow', '_categoryWindow', '_itemList', '_window' ];
    candidates.forEach(function(p){
      try {
        var w = scene[p];
        if (w) installOnListInstance(w);
      } catch(e){}
    });
    // also try a few common alternate properties
    [ '_help', '_helpWindow' ].forEach(function(p){
      try { installOnListInstance(scene[p]); } catch(e){}
    });
  }

  // Hook SceneManager.push to install on new scenes
  var _origPush = SceneManager.push;
  SceneManager.push = function(sceneClass) {
    _origPush.call(this, sceneClass);
    setTimeout(function(){ try { installOnScene(SceneManager._scene); } catch(e){} }, 40);
  };

  // Attempt immediate install if a synth scene is already active
  setTimeout(function(){ try { installOnScene(SceneManager._scene); } catch(e){} }, 60);

})();

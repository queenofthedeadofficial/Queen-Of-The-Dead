/*:
 * @plugindesc Replace YEP synthesis command window with a category selector (Food / Potions / Soups / Close).
 * Hovering a category shows only craftable items of that category in the box below; other craftable items are hidden.
 * Pressing OK on a category locks focus to the craftable-items window (unchanged).
 * Place after YEP Item Synthesis and SynthesisCategories plugin.
 * @author You
 * @help
 * Hovering Food / Potions / Soups filters the synthesis list below to only show
 * recipes/items with the matching notetag:
 *
 *   <Synthesis Category: Foods>
 *   <Synthesis Category: Potions>
 *   <Synthesis Category: Soups>
 *
 * "Close" returns to the previous menu.
 */
(function() {
  'use strict';

  var CATEGORY_LIST = [
    { key: 'Foods',   label: 'Food' },
    { key: 'Potions', label: 'Potions' },
    { key: 'Soups',   label: 'Soups' }
  ];

  function Window_SynthCategoryCommand() {
    this.initialize.apply(this, arguments);
  }
  Window_SynthCategoryCommand.prototype = Object.create(Window_Command.prototype);
  Window_SynthCategoryCommand.prototype.constructor = Window_SynthCategoryCommand;

  Window_SynthCategoryCommand.prototype.initialize = function(x, y, width, height) {
    this._rect = { x: x || 0, y: y || 0, w: width || this.windowWidth(), h: height || this.windowHeight() };
    Window_Command.prototype.initialize.call(this, this._rect.x, this._rect.y);
    this._windowWidth = this._rect.w;
    this._windowHeight = this._rect.h;
    this._lastIndex = -1;
    this._suppressInput = false;
    this.select(0);
    this.activate();
  };

  Window_SynthCategoryCommand.prototype.windowWidth = function() {
    return this._windowWidth || 240;
  };

  Window_SynthCategoryCommand.prototype.windowHeight = function() {
    return this._windowHeight || this.fittingHeight(this.numVisibleRows());
  };

  Window_SynthCategoryCommand.prototype.numVisibleRows = function() {
    return CATEGORY_LIST.length + 1; // categories + Close
  };

  Window_SynthCategoryCommand.prototype.makeCommandList = function() {
    for (var i = 0; i < CATEGORY_LIST.length; i++) {
      var cfg = CATEGORY_LIST[i];
      this.addCommand(cfg.label, 'synth_cat_' + cfg.key.toLowerCase());
    }
    this.addCommand('Close', 'close');
  };

  // Prevent cursor movement/handling when suppressed
  Window_SynthCategoryCommand.prototype.processCursorMove = function() {
    if (this._suppressInput) return;
    Window_Selectable.prototype.processCursorMove.call(this);
  };

  Window_SynthCategoryCommand.prototype.processHandling = function() {
    if (this._suppressInput) return;
    Window_Selectable.prototype.processHandling.call(this);
  };

  Window_SynthCategoryCommand.prototype.isMouseOver = function() {
    var x = TouchInput.x;
    var y = TouchInput.y;
    return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height;
  };

  var _Window_SynthCategoryCommand_update = Window_SynthCategoryCommand.prototype.update;
  Window_SynthCategoryCommand.prototype.update = function() {
    _Window_SynthCategoryCommand_update.call(this);
    if (this.isOpen() && this.visible && this.isMouseOver() && !this._suppressInput) {
      var localY = TouchInput.y - this.y;
      var rowHeight = this.itemHeight();
      var idx = Math.floor(localY / rowHeight);
      if (idx < 0) idx = 0;
      if (idx >= this.maxItems()) idx = this.maxItems() - 1;
      if (this.index() !== idx) this.select(idx);
    }
    if (this._lastIndex !== this.index()) {
      this._lastIndex = this.index();
      if (typeof this.onIndexChange === 'function') {
        try { this.onIndexChange(this._lastIndex); } catch (e) { /* ignore */ }
      }
    }
  };

  var sceneNames = ['Scene_ItemSynthesis', 'Scene_Synthesis'];
  function findSynthesisSceneName() {
    for (var i = 0; i < sceneNames.length; i++) {
      if (typeof window[sceneNames[i]] !== 'undefined') return sceneNames[i];
    }
    return null;
  }

  var candidateCommandProps = [
    '_commandWindow', '_categoryWindow', '_listWindow', '_synthesisWindow',
    '_commandListWindow', '_recipeWindow', '_itemWindow', '_itemListWindow'
  ];

  // --- Notetag helpers --------------------------------------------------------

  function dataFromEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'number') {
      return $dataItems && $dataItems[entry] ? $dataItems[entry] : null;
    }
    if (entry.note && typeof entry.note === 'string') return entry;
    if (entry.item && entry.item.note) return entry.item;
    if (entry.recipe && entry.recipe.note) return entry.recipe;
    if (entry.product && entry.product.note) return entry.product;
    if (entry.result && entry.result.note) return entry.result;
    if (entry.object && entry.object.note) return entry.object;
    if (entry.itemId && $dataItems && $dataItems[entry.itemId]) return $dataItems[entry.itemId];
    if (entry.id && entry.note) return entry;
    if (entry.meta && typeof entry.meta === 'object') return entry;
    return null;
  }

  function objectHasSynthesisCategory(obj, category) {
    if (!obj || !category) return false;
    var data = dataFromEntry(obj);
    if (!data) return false;

    if (data.meta && typeof data.meta === 'object') {
      for (var k in data.meta) {
        if (!data.meta.hasOwnProperty(k)) continue;
        if (k.toLowerCase() === 'synthesis category') {
          var v = data.meta[k];
          if (typeof v === 'string' && v.toLowerCase() === category.toLowerCase()) return true;
        }
      }
    }

    var note = data.note || '';
    if (!note) return false;

    var safeCat = category.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    var re = new RegExp('<\\s*Synthesis\\s+Category\\s*:\\s*' + safeCat + '\\s*>', 'i');
    return re.test(note);
  }

  // --- Filtering helpers -----------------------------------------------------

  function applyCategoryFilterToWindow(win, category) {
    if (!win || !category) return;
    try {
      var arrays = ['_data', '_list', '_items', '_recipes', 'items'];
      for (var i = 0; i < arrays.length; i++) {
        var name = arrays[i];
        if (win[name] && Array.isArray(win[name])) {
          if (!win._originalData) win._originalData = win[name].slice(0);
          var source = win._originalData || win[name];
          win[name] = source.filter(function(entry) {
            return objectHasSynthesisCategory(entry, category);
          });
        }
      }

      if (win._originalData && win._originalData.length && typeof win._originalData[0] === 'number') {
        win._originalData = win._originalData.slice(0);
        win._filteredIds = win._originalData.filter(function(id) {
          var d = $dataItems && $dataItems[id] ? $dataItems[id] : null;
          return objectHasSynthesisCategory(d, category);
        });
        if (Array.isArray(win.items)) win.items = win._filteredIds.slice(0);
        if (Array.isArray(win._list)) win._list = win._filteredIds.slice(0);
      }

      if (typeof win.setItemList === 'function' && win._originalData) {
        try {
          var filtered = win._originalData.filter(function(entry) {
            return objectHasSynthesisCategory(entry, category);
          });
          win.setItemList(filtered);
        } catch (e) { /* ignore */ }
      }

      if (typeof win.refresh === 'function') win.refresh();
    } catch (e) {
      console.error('applyCategoryFilterToWindow error', e);
    }
  }

  function restoreWindowOriginalData(win) {
    if (!win) return;
    try {
      if (win._originalData) {
        var arrays = ['_data', '_list', '_items', '_recipes', 'items'];
        for (var i = 0; i < arrays.length; i++) {
          var name = arrays[i];
          if (Array.isArray(win[name])) win[name] = win._originalData.slice(0);
        }
        if (Array.isArray(win.items) && win._originalData && typeof win._originalData[0] === 'number') {
          win.items = win._originalData.slice(0);
        }
        if (typeof win.setItemList === 'function') {
          try { win.setItemList(win._originalData.slice(0)); } catch (e) {}
        }
        if (typeof win.refresh === 'function') win.refresh();
      }
    } catch (e) { /* ignore */ }
  }

  // --- Scene patching --------------------------------------------------------

  var synthSceneName = findSynthesisSceneName();
  if (synthSceneName) {
    var synthProto = window[synthSceneName].prototype;

    var _orig_create = synthProto.create;
    synthProto.create = function() {
      _orig_create.call(this);

      try {
        var foundProp = null;
        var rect = { x: 0, y: 0, w: Graphics.boxWidth, h: Graphics.boxHeight / 3 };

        for (var i = 0; i < candidateCommandProps.length; i++) {
          var prop = candidateCommandProps[i];
          if (this[prop]) {
            foundProp = prop;
            var w = this[prop].width !== undefined ? this[prop].width : (this[prop].windowWidth ? this[prop].windowWidth() : this[prop].rect ? this[prop].rect.width : null);
            var h = this[prop].height !== undefined ? this[prop].height : (this[prop].windowHeight ? this[prop].windowHeight() : this[prop].rect ? this[prop].rect.height : null);
            rect.x = this[prop].x !== undefined ? this[prop].x : rect.x;
            rect.y = this[prop].y !== undefined ? this[prop].y : rect.y;
            rect.w = w || rect.w;
            rect.h = h || rect.h;
            break;
          }
        }

        if (!foundProp) {
          for (var k in this) {
            if (!this.hasOwnProperty(k)) continue;
            if (typeof this[k] === 'object' && this[k] && this[k].x !== undefined && /synth|recipe|list|item/i.test(k)) {
              foundProp = k;
              rect.x = this[k].x; rect.y = this[k].y;
              rect.w = this[k].width || rect.w; rect.h = this[k].height || rect.h;
              break;
            }
          }
        }

        this._synthFoundProp = foundProp;

        if (foundProp && this[foundProp]) {
          this._originalSynthesisWindow = this[foundProp];
          try {
            if (this._originalSynthesisWindow.hide) {
              this._originalSynthesisWindow.hide();
              if (typeof this._originalSynthesisWindow.deactivate === 'function') this._originalSynthesisWindow.deactivate();
            }
          } catch (e) { /* ignore */ }
        } else {
          this._originalSynthesisWindow = null;
        }

        var catWin = new Window_SynthCategoryCommand(rect.x, rect.y, rect.w, rect.h);
        var scene = this;

        // Hover preview: when index changes, show only recipes matching that category
        catWin.onIndexChange = function(index) {
          if (index >= 0 && index < CATEGORY_LIST.length) {
            var key = CATEGORY_LIST[index].key;
            $gameSystem._synthFilter = key;
            if (scene._originalSynthesisWindow) {
              restoreWindowOriginalData(scene._originalSynthesisWindow);
              try { if (typeof scene._originalSynthesisWindow.makeItemList === 'function') scene._originalSynthesisWindow.makeItemList(); } catch (e) {}
              applyCategoryFilterToWindow(scene._originalSynthesisWindow, key);
              try { if (typeof scene._originalSynthesisWindow.show === 'function') scene._originalSynthesisWindow.show(); } catch (e) {}
            } else {
              var candidates = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow','_commandWindow','_categoryWindow'];
              for (var i = 0; i < candidates.length; i++) {
                var name = candidates[i];
                if (scene[name]) {
                  restoreWindowOriginalData(scene[name]);
                  try { if (typeof scene[name].makeItemList === 'function') scene[name].makeItemList(); } catch (e) {}
                  applyCategoryFilterToWindow(scene[name], key);
                  try { if (typeof scene[name].show === 'function') scene[name].show(); } catch (e) {}
                  break;
                }
              }
            }
          } else {
            // Close hovered: hide and restore full list
            $gameSystem._synthFilter = null;
            if (scene._originalSynthesisWindow) {
              try { scene._originalSynthesisWindow.hide(); } catch (e) {}
              restoreWindowOriginalData(scene._originalSynthesisWindow);
            } else {
              var candidates2 = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow','_commandWindow','_categoryWindow'];
              for (var j = 0; j < candidates2.length; j++) {
                var nm = candidates2[j];
                if (scene[nm]) {
                  try { scene[nm].hide(); } catch (e) {}
                  restoreWindowOriginalData(scene[nm]);
                }
              }
            }
          }
        };

        // OK on category: lock focus to item window (unchanged behavior)
        for (var j = 0; j < CATEGORY_LIST.length; j++) {
          (function(key){
            catWin.setHandler('synth_cat_' + key.toLowerCase(), function() {
              $gameSystem._synthFilter = key;
              if (scene._originalSynthesisWindow) {
                restoreWindowOriginalData(scene._originalSynthesisWindow);
                try { if (typeof scene._originalSynthesisWindow.makeItemList === 'function') scene._originalSynthesisWindow.makeItemList(); } catch (e) {}
                applyCategoryFilterToWindow(scene._originalSynthesisWindow, key);
                try { if (typeof scene._originalSynthesisWindow.show === 'function') scene._originalSynthesisWindow.show(); } catch (e) {}
                try {
                  if (typeof scene._originalSynthesisWindow.activate === 'function') scene._originalSynthesisWindow.activate();
                  if (typeof scene._synthCategoryCommandWindow.deactivate === 'function') scene._synthCategoryCommandWindow.deactivate();
                  scene._synthCategoryCommandWindow._suppressInput = true;
                } catch (e) {}
              } else {
                var candidates = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow','_commandWindow','_categoryWindow'];
                for (var i = 0; i < candidates.length; i++) {
                  var name = candidates[i];
                  if (scene[name]) {
                    restoreWindowOriginalData(scene[name]);
                    try { if (typeof scene[name].makeItemList === 'function') scene[name].makeItemList(); } catch (e) {}
                    applyCategoryFilterToWindow(scene[name], key);
                    try { if (typeof scene[name].show === 'function') scene[name].show(); } catch (e) {}
                    try {
                      if (typeof scene[name].activate === 'function') scene[name].activate();
                      if (typeof scene._synthCategoryCommandWindow.deactivate === 'function') scene._synthCategoryCommandWindow.deactivate();
                      scene._synthCategoryCommandWindow._suppressInput = true;
                    } catch (e) {}
                    break;
                  }
                }
              }
            });
          })(CATEGORY_LIST[j].key);
        }

        // Close handler
        catWin.setHandler('close', function() {
          $gameSystem._synthFilter = null;
          try {
            if (scene._synthCategoryCommandWindow) scene._synthCategoryCommandWindow.hide();
            if (scene._originalSynthesisWindow) {
              restoreWindowOriginalData(scene._originalSynthesisWindow);
              if (typeof scene._originalSynthesisWindow.hide === 'function') scene._originalSynthesisWindow.hide();
            }
          } catch (e) {}
          SceneManager.pop();
        });

        this._synthCategoryCommandWindow = catWin;

        if (typeof this.addWindow === 'function') {
          this.addWindow(catWin);
        } else if (SceneManager._scene && SceneManager._scene.addWindow) {
          SceneManager._scene.addWindow(catWin);
        } else if (SceneManager._scene && SceneManager._scene.addChild) {
          SceneManager._scene.addChild(catWin);
        }

        if (this._synthCategoryCommandWindow && this._synthCategoryCommandWindow.activate) this._synthCategoryCommandWindow.activate();

        if (this._originalSynthesisWindow) {
          try { this._originalSynthesisWindow.hide(); } catch (e) {}
        }

      } catch (err) {
        console.error('SynthesisCategories_ReplaceCommand: failed to inject category window', err);
      }
    };

    // Return focus to category window on pointer over / left-right / cancel
    var _orig_update = synthProto.update;
    synthProto.update = function() {
      _orig_update.call(this);

      try {
        var cat = this._synthCategoryCommandWindow;
        var orig = this._originalSynthesisWindow;

        if (cat && cat.visible && cat.isMouseOver()) {
          try { if (typeof cat.activate === 'function') cat.activate(); } catch (e) {}
          try { if (orig && typeof orig.deactivate === 'function') orig.deactivate(); } catch (e) {}
          if (cat) cat._suppressInput = false;
        }

        if (cat && (Input.isTriggered('left') || Input.isTriggered('right') || Input.isTriggered('cancel'))) {
          try { if (typeof cat.activate === 'function') cat.activate(); } catch (e) {}
          try { if (orig && typeof orig.deactivate === 'function') orig.deactivate(); } catch (e) {}
          if (cat) cat._suppressInput = false;
        }
      } catch (e) { /* ignore */ }
    };

    var _orig_terminate = synthProto.terminate || function(){};
    synthProto.terminate = function() {
      $gameSystem._synthFilter = null;
      if (this._synthCategoryCommandWindow) {
        try {
          if (typeof this.removeWindow === 'function') this.removeWindow(this._synthCategoryCommandWindow);
          else if (SceneManager._scene && SceneManager._scene.removeWindow) SceneManager._scene.removeWindow(this._synthCategoryCommandWindow);
          else if (SceneManager._scene && SceneManager._scene.removeChild) SceneManager._scene.removeChild(this._synthCategoryCommandWindow);
        } catch (e) {}
        this._synthCategoryCommandWindow = null;
      }
      var foundProp = this._synthFoundProp;
      if (this._originalSynthesisWindow && foundProp && !this[foundProp]) {
        try { this[foundProp] = this._originalSynthesisWindow; } catch (e) {}
      }
      if (this._originalSynthesisWindow) {
        try { restoreWindowOriginalData(this._originalSynthesisWindow); } catch (e) {}
        this._originalSynthesisWindow = null;
      }
      this._synthFoundProp = null;
      if (_orig_terminate) _orig_terminate.call(this);
    };

  } else {
    console.log('SynthesisCategories_ReplaceCommand: no synthesis scene found; plugin inactive.');
  }

})();

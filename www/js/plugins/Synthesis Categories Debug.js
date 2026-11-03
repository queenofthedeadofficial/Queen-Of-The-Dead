/*:
 * @plugindesc Category-first synthesis menus: Foods, Potions, Soups (by Food), Soups (by Potions). Each option opens a dedicated scene sized/positioned to match the YEP Item Synthesis window. @author You
 * @help
 * - Open the synthesis scene as usual; the plugin will push a category menu first.
 * - Foods / Potions open dedicated scenes showing items in that category (alphabetical).
 * - Soups (by Food) / Soups (by Potions) first show a source list (Foods or Potions). OK on a source item opens the Soups scene filtered to soups that list the selected source item in their <Synthesis Materials> notetag.
 * - Cancel in any dedicated scene returns to the category menu.
 *
 * Place this plugin after YEP Item Synthesis and SynthesisCategories plugin.
 */

(function() {
  'use strict';

  // --- Configuration ---------------------------------------------------------
  var DEBUG = false;

  var CATEGORY_LIST = [
    { key: 'Foods',               label: 'Foods' },
    { key: 'Potions',             label: 'Potions' },
    { key: 'Soups (by Food)',     label: 'Soups (by Food)' },
    { key: 'Soups (by Potions)',  label: 'Soups (by Potions)' }
  ];

  // --- Logging helper -------------------------------------------------------
  function log() {
    if (!DEBUG) return;
    try { console.log.apply(console, arguments); } catch (e) {}
  }

  // --- Helper: stable symbol for category keys ------------------------------
  function symbolForKey(key) {
    if (!key) return 'synth_cat_unknown';
    return 'synth_cat_' + String(key).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g,'');
  }

  // --- Helper: get the YEP ItemSynthesis window rect (x,y,w,h) --------------
  function getDefaultSynthRect() {
    // 1) If $gameSystem already stored a rect, prefer it
    if ($gameSystem && $gameSystem._synthDefaultRect) {
      var r = $gameSystem._synthDefaultRect;
      return { x: Number(r.x) || 0, y: Number(r.y) || 0, w: Number(r.w) || Graphics.boxWidth, h: Number(r.h) || Graphics.boxHeight };
    }

    // 2) Try to find the active YEP synthesis scene instance on the SceneManager stack
    try {
      if (SceneManager && SceneManager._stack && Array.isArray(SceneManager._stack)) {
        for (var i = SceneManager._stack.length - 1; i >= 0; i--) {
          var sc = SceneManager._stack[i];
          if (!sc) continue;
          var name = sc.constructor && sc.constructor.name ? sc.constructor.name : '';
          if (name === 'Scene_ItemSynthesis' || name === 'Scene_Synthesis' || name.indexOf('Synthesis') !== -1) {
            var candProps = ['_itemWindow','_recipeWindow','_synthesisWindow','_listWindow','_itemListWindow','_recipeListWindow','_originalSynthesisWindow'];
            for (var p = 0; p < candProps.length; p++) {
              var prop = candProps[p];
              if (sc[prop]) {
                var win = sc[prop];
                var w = (win.width !== undefined) ? win.width : (win.windowWidth ? win.windowWidth() : (win.rect ? win.rect.width : null));
                var h = (win.height !== undefined) ? win.height : (win.windowHeight ? win.windowHeight() : (win.rect ? win.rect.height : null));
                var x = (win.x !== undefined) ? win.x : (win._x !== undefined ? win._x : 0);
                var y = (win.y !== undefined) ? win.y : (win._y !== undefined ? win._y : 0);
                return { x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || Graphics.boxWidth, h: Number(h) || Graphics.boxHeight };
              }
            }
            // fallback scan for window-like objects
            for (var k in sc) {
              if (!sc.hasOwnProperty(k)) continue;
              var obj = sc[k];
              if (!obj || typeof obj !== 'object') continue;
              if (typeof obj.makeItemList === 'function' || typeof obj.setItemList === 'function') {
                var ww = (obj.width !== undefined) ? obj.width : (obj.windowWidth ? obj.windowWidth() : (obj.rect ? obj.rect.width : null));
                var hh = (obj.height !== undefined) ? obj.height : (obj.windowHeight ? obj.windowHeight() : (obj.rect ? obj.rect.height : null));
                var xx = (obj.x !== undefined) ? obj.x : (obj._x !== undefined ? obj._x : 0);
                var yy = (obj.y !== undefined) ? obj.y : (obj._y !== undefined ? obj._y : 0);
                return { x: Number(xx) || 0, y: Number(yy) || 0, w: Number(ww) || Graphics.boxWidth, h: Number(hh) || Graphics.boxHeight };
              }
            }
          }
        }
      }
    } catch (e) { /* ignore scanning errors */ }

    // 3) Fallback: centered reasonable default
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight;
    var fw = Math.floor(ww * 0.5);
    var fh = Math.floor(wh * 0.5);
    return { x: Math.floor((ww - fw) / 2), y: Math.floor((wh - fh) / 2), w: fw, h: fh };
  }

  // --- Category command window ----------------------------------------------
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
      var sym = symbolForKey(cfg.key);
      this.addCommand(cfg.label, sym);
    }
    this.addCommand('Close', 'close');
  };

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

  // --- Helpers: data resolution and category/material checks -----------------
  function dataFromEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'number') {
      if ($dataItems && $dataItems[entry]) return $dataItems[entry];
      if ($dataWeapons && $dataWeapons[entry]) return $dataWeapons[entry];
      if ($dataArmors && $dataArmors[entry]) return $dataArmors[entry];
      return null;
    }
    var idCandidates = ['itemId','resultId','recipeId','productId','id'];
    for (var i = 0; i < idCandidates.length; i++) {
      var key = idCandidates[i];
      if (entry[key] !== undefined && entry[key] !== null) {
        var val = entry[key];
        if (typeof val === 'number') {
          if ($dataItems && $dataItems[val]) return $dataItems[val];
          if ($dataWeapons && $dataWeapons[val]) return $dataWeapons[val];
          if ($dataArmors && $dataArmors[val]) return $dataArmors[val];
        }
      }
    }
    var nestedKeys = ['item','recipe','product','result','object'];
    for (var j = 0; j < nestedKeys.length; j++) {
      var nk = nestedKeys[j];
      if (entry[nk] && typeof entry[nk] === 'object') return entry[nk];
    }
    if (entry.note && typeof entry.note === 'string') return entry;
    if (entry.meta && typeof entry.meta === 'object') return entry;
    if (entry.id && typeof entry.id === 'number' && $dataItems && $dataItems[entry.id]) return $dataItems[entry.id];
    return null;
  }

  function objectHasSynthesisCategory(obj, category) {
    if (!obj || !category) return false;
    var data = dataFromEntry(obj);
    if (!data) return false;
    var cat = String(category).trim().toLowerCase();
    if (data.meta && typeof data.meta === 'object') {
      var keys = Object.keys(data.meta);
      for (var i = 0; i < keys.length; i++) {
        var rawKey = keys[i];
        var normKey = rawKey.toLowerCase().replace(/[\s_\-]/g, '');
        if (normKey === 'synthesiscategory') {
          var val = String(data.meta[rawKey]).trim().toLowerCase();
          if (val === cat) return true;
          if (val + 's' === cat || (val.endsWith('s') && val.slice(0,-1) === cat)) return true;
        }
      }
    }
    var note = data.note || '';
    if (!note) return false;
    var safe = function(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'); };
    var catSafe = safe(category);
    var catSing = catSafe.replace(/s$/i,'');
    var catPlural = catSing + 's';
    var reAngle = new RegExp('<\\s*Synthesis\\s*Category\\s*:\\s*(?:' + catSafe + '|' + catSing + '|' + catPlural + ')\\s*>', 'i');
    var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Category\\s*:\\s*(?:' + catSafe + '|' + catSing + '|' + catPlural + ')\\s*(\\n|$)', 'i');
    var matched = reAngle.test(note) || rePlain.test(note);
    return matched;
  }

  function objectHasSynthesisMaterialsMatch(obj, materialId) {
    if (!obj || !materialId) return false;
    var data = dataFromEntry(obj);
    if (!data) return false;
    if (data.meta && typeof data.meta === 'object') {
      var keys = Object.keys(data.meta);
      for (var i = 0; i < keys.length; i++) {
        var rawKey = keys[i];
        var normKey = rawKey.toLowerCase().replace(/[\s_\-]/g, '');
        if (normKey === 'synthesismaterials') {
          var val = String(data.meta[rawKey]).trim();
          var re = new RegExp('(^|[^0-9])' + String(materialId) + '([^0-9]|$)');
          if (re.test(val)) return true;
        }
      }
    }
    var note = data.note || '';
    if (!note) return false;
    var safeId = String(materialId).replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&');
    var reAngle = new RegExp('<\\s*Synthesis\\s*Materials\\s*:\\s*([^>]+)>', 'i');
    var m = note.match(reAngle);
    if (m && m[1]) {
      var content = m[1];
      var reId = new RegExp('(^|[^0-9])' + safeId + '([^0-9]|$)');
      if (reId.test(content)) return true;
    }
    var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Materials\\s*:\\s*([^\\n]+)', 'i');
    var m2 = note.match(rePlain);
    if (m2 && m2[2]) {
      var content2 = m2[2];
      var reId2 = new RegExp('(^|[^0-9])' + safeId + '([^0-9]|$)');
      if (reId2.test(content2)) return true;
    }
    return false;
  }

  // --- Filtering helpers ----------------------------------------------------
  function applyCategoryFilterToWindow(win, category) {
    if (!win || !category) return;
    if (win._applyingSynthFilter) return;
    win._applyingSynthFilter = true;
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
      if ($gameSystem && $gameSystem._synthMaterialOverride && String(category).toLowerCase().indexOf('soup') !== -1) {
        var matId = $gameSystem._synthMaterialOverride;
        var arrays2 = ['_data', '_list', '_items', '_recipes', 'items'];
        for (var j = 0; j < arrays2.length; j++) {
          var nm = arrays2[j];
          if (Array.isArray(win[nm])) {
            win[nm] = win[nm].filter(function(entry) {
              var d = dataFromEntry(entry);
              return objectHasSynthesisMaterialsMatch(d, matId);
            });
          }
        }
      }
      if (win._originalData && win._originalData.length && typeof win._originalData[0] === 'number') {
        win._originalData = win._originalData.slice(0);
        win._filteredIds = win._originalData.filter(function(id) {
          var d = $dataItems && $dataItems[id] ? $dataItems[id] : null;
          var ok = objectHasSynthesisCategory(d, category);
          if ($gameSystem && $gameSystem._synthMaterialOverride && String(category).toLowerCase().indexOf('soup') !== -1) {
            ok = ok && objectHasSynthesisMaterialsMatch(d, $gameSystem._synthMaterialOverride);
          }
          return ok;
        });
        if (Array.isArray(win.items)) win.items = win._filteredIds.slice(0);
        if (Array.isArray(win._list)) win._list = win._filteredIds.slice(0);
      }
      if (typeof win.setItemList === 'function' && win._originalData) {
        try {
          var filtered = win._originalData.filter(function(entry) {
            var ok = objectHasSynthesisCategory(entry, category);
            if ($gameSystem && $gameSystem._synthMaterialOverride && String(category).toLowerCase().indexOf('soup') !== -1) {
              var d = dataFromEntry(entry);
              ok = ok && objectHasSynthesisMaterialsMatch(d, $gameSystem._synthMaterialOverride);
            }
            return ok;
          });
          win.setItemList(filtered);
        } catch (e) { /* ignore */ }
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

  // --- Safe patches to reapply filter when windows rebuild -------------------
  (function() {
    var proto = Window_ItemList && Window_ItemList.prototype;
    if (proto && !proto._synthFilterPatched) {
      var _orig_makeItemList = proto.makeItemList;
      proto.makeItemList = function() {
        if (_orig_makeItemList) _orig_makeItemList.call(this);
        if (this._applyingSynthFilter) return;
        if ($gameSystem && $gameSystem._synthFilter) {
          try { applyCategoryFilterToWindow(this, $gameSystem._synthFilter); } catch (e) {}
        }
      };
      proto._synthFilterPatched = true;
    }

    var proto2 = Window_Selectable && Window_Selectable.prototype;
    if (proto2 && !proto2._synthFilterRefreshPatched) {
      var _orig_refresh = proto2.refresh;
      proto2.refresh = function() {
        if (_orig_refresh) _orig_refresh.call(this);
        if (this._applyingSynthFilter) return;
        if ($gameSystem && $gameSystem._synthFilter) {
          try { applyCategoryFilterToWindow(this, $gameSystem._synthFilter); } catch (e) {}
        }
      };
      proto2._synthFilterRefreshPatched = true;
    }
  })();

  // --- Scene detection ------------------------------------------------------
  var sceneNames = ['Scene_ItemSynthesis', 'Scene_Synthesis'];
  function findSynthesisSceneName() {
    for (var i = 0; i < sceneNames.length; i++) {
      if (typeof window[sceneNames[i]] !== 'undefined') return sceneNames[i];
    }
    return null;
  }
  var synthSceneName = findSynthesisSceneName();

  // Candidate properties to find the original synthesis/list window in the scene
  var candidateCommandProps = [
    '_commandWindow', '_categoryWindow', '_listWindow', '_synthesisWindow',
    '_commandListWindow', '_recipeWindow', '_itemWindow', '_itemListWindow'
  ];

  // --- Window: filtered item list (alphabetical) ----------------------------
  function Window_SynthItemList() {
    this.initialize.apply(this, arguments);
  }
  Window_SynthItemList.prototype = Object.create(Window_ItemList.prototype);
  Window_SynthItemList.prototype.constructor = Window_SynthItemList;

  Window_SynthItemList.prototype.initialize = function(x, y, width, height, category) {
    this._synthCategory = category || null;
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
    this.activate();
  };

  Window_SynthItemList.prototype.makeItemList = function() {
    this._data = [];
    if (!this._synthCategory) return;
    if ($dataItems && Array.isArray($dataItems)) {
      for (var i = 1; i < $dataItems.length; i++) {
        var it = $dataItems[i];
        if (it && objectHasSynthesisCategory(it, this._synthCategory)) {
          this._data.push(it);
        }
      }
      // Sort alphabetically by name
      this._data.sort(function(a,b){
        var an = a && a.name ? a.name.toLowerCase() : '';
        var bn = b && b.name ? b.name.toLowerCase() : '';
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }
  };

  Window_SynthItemList.prototype.includes = function(item) {
    return !!item;
  };

  Window_SynthItemList.prototype.isEnabled = function(item) {
    return true;
  };

  Window_SynthItemList.prototype.item = function() {
    return this._data && this._data[this.index()] ? this._data[this.index()] : null;
  };

  // --- Scene: category main (first scene) ----------------------------------
  function Scene_SynthCategoryMain() {
    this.initialize.apply(this, arguments);
  }
  Scene_SynthCategoryMain.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_SynthCategoryMain.prototype.constructor = Scene_SynthCategoryMain;

  Scene_SynthCategoryMain.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
  };

  Scene_SynthCategoryMain.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);

    // Use YEP default synth rect so the category window matches the YEP synthesis window
    var defRect = getDefaultSynthRect();
    var x = defRect.x, y = defRect.y, w = defRect.w, h = defRect.h;

    this._categoryWindow = new Window_SynthCategoryCommand(x, y, w, h);
    var scene = this;

    // Handlers: Foods / Potions open dedicated scenes that use the original synthesis scene layout
    for (var i = 0; i < CATEGORY_LIST.length; i++) {
      (function(cfg){
        var id = symbolForKey(cfg.key);
        scene._categoryWindow.setHandler(id, function() {
          var key = cfg.key;
          if (key === 'Foods' || key === 'Potions') {
            if ($gameSystem) {
              $gameSystem._synthFilter = key;
              $gameSystem._synthDirectOpen = true;
              $gameSystem._synthMaterialOverride = null;
            }
            try { SceneManager.push(synthSceneName); } catch (e) { /* fallback: nothing */ }
          } else if (key === 'Soups (by Food)') {
            if ($gameSystem) $gameSystem._synthTempSourceMode = 'food';
            try { SceneManager.push(Scene_SoupSourceList); } catch (e) {}
          } else if (key === 'Soups (by Potions)') {
            if ($gameSystem) $gameSystem._synthTempSourceMode = 'potion';
            try { SceneManager.push(Scene_SoupSourceList); } catch (e) {}
          } else {
            if ($gameSystem) {
              $gameSystem._synthFilter = key;
              $gameSystem._synthDirectOpen = true;
            }
            try { SceneManager.push(synthSceneName); } catch (e) {}
          }
        });
      })(CATEGORY_LIST[i]);
    }

    this._categoryWindow.setHandler('close', function() {
      try { SceneManager.goto(Scene_Menu); } catch (e) { SceneManager.pop(); }
    });

    this._categoryWindow.setHandler('cancel', function() {
      try { SceneManager.goto(Scene_Menu); } catch (e) { SceneManager.pop(); }
    });

    this.addWindow(this._categoryWindow);
    this._categoryWindow.activate();
  };

  Scene_SynthCategoryMain.prototype.terminate = function() {
    if (this._categoryWindow) {
      try { this.removeWindow(this._categoryWindow); } catch (e) {}
      this._categoryWindow = null;
    }
    Scene_MenuBase.prototype.terminate.call(this);
  };

  // --- Scene: source list for Soups by Food / by Potions --------------------
  function Scene_SoupSourceList() {
    this.initialize.apply(this, arguments);
  }
  Scene_SoupSourceList.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_SoupSourceList.prototype.constructor = Scene_SoupSourceList;

  Scene_SoupSourceList.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
  };

  Scene_SoupSourceList.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);

    // Use YEP default synth rect so the source list matches the YEP synthesis window
    var defRect = getDefaultSynthRect();
    var x = defRect.x, y = defRect.y, w = defRect.w, h = defRect.h;

    // Determine source category
    var mode = ($gameSystem && $gameSystem._synthTempSourceMode) ? $gameSystem._synthTempSourceMode : 'food';
    if ($gameSystem) $gameSystem._synthTempSourceMode = null;

    var sourceCategory = (mode === 'potion') ? 'Potions' : 'Foods';

    // Create a Window_SynthItemList showing the source items (Foods or Potions)
    this._sourceList = new Window_SynthItemList(x, y, w, h, sourceCategory);
    var scene = this;
    this._sourceList.setHandler('ok', function() {
      var item = scene._sourceList.item();
      if (!item) return;
      var id = item.id || item.itemId || null;
      if (!id && item && item.id) id = item.id;
      if ($gameSystem) {
        $gameSystem._synthMaterialOverride = id;
        $gameSystem._synthFilter = 'Soups';
        $gameSystem._synthDirectOpen = true;
      }
      try { SceneManager.push(synthSceneName); } catch (e) {}
    });
    this._sourceList.setHandler('cancel', function() {
      SoundManager.playCancel();
      SceneManager.pop(); // back to category menu
    });

    this.addWindow(this._sourceList);
    this._sourceList.activate();
  };

  Scene_SoupSourceList.prototype.terminate = function() {
    if (this._sourceList) {
      try { this.removeWindow(this._sourceList); } catch (e) {}
      this._sourceList = null;
    }
    Scene_MenuBase.prototype.terminate.call(this);
  };

  // --- Patch synthesis scene to capture default rect and support direct-open ---
  if (synthSceneName) {
    var synthProto = window[synthSceneName].prototype;

    // Save original create
    var _orig_create = synthProto.create;
    synthProto.create = function() {
      // Call original create so the scene builds its windows
      _orig_create.call(this);

      // Attempt to compute a default rect for the main synthesis/list window so dedicated scenes can match layout
      try {
        var foundProp = null;
        var rect = { x: 0, y: 0, w: Graphics.boxWidth, h: Graphics.boxHeight / 3 };

        for (var i = 0; i < candidateCommandProps.length; i++) {
          var prop = candidateCommandProps[i];
          if (this[prop]) {
            foundProp = prop;
            var w = this[prop].width !== undefined ? this[prop].width : (this[prop].windowWidth ? this[prop].windowWidth() : (this[prop].rect ? this[prop].rect.width : null));
            var h = this[prop].height !== undefined ? this[prop].height : (this[prop].windowHeight ? this[prop].windowHeight() : (this[prop].rect ? this[prop].rect.height : null));
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

        // Store default rect for other scenes to use
        if ($gameSystem) $gameSystem._synthDefaultRect = rect;
        this._synthFoundProp = foundProp;
        if (foundProp && this[foundProp]) {
          this._originalSynthesisWindow = this[foundProp];
        } else {
          this._originalSynthesisWindow = null;
        }
      } catch (e) {
        log('Failed to compute synth default rect', e);
      }

      // If not direct-open, push the category main scene so the category menu is shown first
      try {
        if (!($gameSystem && $gameSystem._synthDirectOpen)) {
          SceneManager.push(Scene_SynthCategoryMain);
          return;
        }
      } catch (e) {
        log('Error pushing category main', e);
      }

      // If direct-open mode is active, apply the filter to the scene's synthesis/list window
      try {
        if ($gameSystem && $gameSystem._synthDirectOpen) {
          var key = $gameSystem._synthFilter || null;
          if (key) {
            // Try to find the main synthesis/list window on the scene
            var found = null;
            for (var i2 = 0; i2 < candidateCommandProps.length; i2++) {
              var prop2 = candidateCommandProps[i2];
              if (this[prop2]) {
                found = this[prop2];
                break;
              }
            }
            // Fallback: scan scene properties for likely windows
            if (!found) {
              for (var k2 in this) {
                if (!this.hasOwnProperty(k2)) continue;
                var obj = this[k2];
                if (obj && typeof obj === 'object' && (obj.makeItemList || obj.setItemList || obj.refresh)) {
                  found = obj;
                  break;
                }
              }
            }

            if (found) {
              try {
                restoreWindowOriginalData(found);
                if (typeof found.makeItemList === 'function') found.makeItemList();
              } catch (e) {}
              try { applyCategoryFilterToWindow(found, key); } catch (e) {}
              try { if (typeof found.show === 'function') found.show(); } catch (e) {}
              try {
                if (typeof found.activate === 'function') found.activate();
                if (this._synthCategoryCommandWindow) {
                  try { this._synthCategoryCommandWindow.hide(); } catch (e) {}
                }
                // Override cancel handler so Cancel returns to the category menu (pop)
                try {
                  if (typeof found.setHandler === 'function') {
                    if (!found._origCancelHandler) {
                      try { found._origCancelHandler = found._handlers && found._handlers['cancel'] ? found._handlers['cancel'] : null; } catch (e) { found._origCancelHandler = null; }
                    }
                    try { found.setHandler('cancel', function(){ SoundManager.playCancel(); SceneManager.pop(); }); } catch (e) {}
                  }
                } catch (e) {}
              } catch (e) {}
            } else {
              if (DEBUG) console.warn('SynthesisCategories: could not find synthesis window to apply direct-open filter.');
            }
          }
          // Clear the direct-open flag so subsequent opens behave normally
          $gameSystem._synthDirectOpen = null;
        }
      } catch (err) {
        console.error('SynthesisCategories_ReplaceCommand: direct-open create handling failed', err);
      }
    };

    // Update: ensure category window activation behavior remains consistent
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

    // Terminate: clear filter, material override and restore handlers
    var _orig_terminate = synthProto.terminate || function(){};
    synthProto.terminate = function() {
      $gameSystem._synthFilter = null;
      $gameSystem._synthDirectOpen = null;
      if ($gameSystem) $gameSystem._synthMaterialOverride = null;

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
        try {
          if (this._originalSynthesisWindow._origCancelHandler && typeof this._originalSynthesisWindow.setHandler === 'function') {
            this._originalSynthesisWindow.setHandler('cancel', this._originalSynthesisWindow._origCancelHandler);
            this._originalSynthesisWindow._origCancelHandler = null;
          }
        } catch (e) {}
        this._originalSynthesisWindow = null;
      }

      try {
        var candidates = ['_recipeWindow','_listWindow','_synthesisWindow','_itemWindow','_itemListWindow'];
        for (var i = 0; i < candidates.length; i++) {
          var nm = candidates[i];
          var w = this[nm];
          if (w && w._origCancelHandler && typeof w.setHandler === 'function') {
            try { w.setHandler('cancel', w._origCancelHandler); } catch (e) {}
            w._origCancelHandler = null;
          }
        }
      } catch (e) {}

      this._synthFoundProp = null;
      if (_orig_terminate) _orig_terminate.call(this);
    };
  } else {
    console.log('SynthesisCategories_ReplaceCommand: no synthesis scene found; plugin inactive.');
  }

  // --- Register scenes globally so SceneManager can find them -----------------
  window.Window_SynthItemList = Window_SynthItemList;
  window.Window_SynthCategoryCommand = Window_SynthCategoryCommand;
  window.Scene_SynthCategoryMain = Scene_SynthCategoryMain;
  window.Scene_SoupSourceList = Scene_SoupSourceList;

})();

/*:
 * @plugindesc CustomSynthesisCategories plugin (single-file patch). Ensures OK opens craft prompt and does not close the scene. @author You
 * @help
 * - Use openCustomSynthesisCategory('Foods') etc.
 * - Tag items with <Synthesis Category: Foods> and materials with <Synthesis Materials: id x qty, ...>
 * - Press OK on a recipe to open "Craft how many [Item]? Up to x" and input a number.
 * - Cancel closes the prompt and returns focus to the list.
 *
 * Installation:
 * - Save as js/plugins/CustomSynthesis_CraftingPatch.js
 * - Place after any menu manager plugins and run a full playtest.
 */
(function() {
  'use strict';

  var CATEGORY_LIST = ['Foods','Potions','Soups'];
  var DEBUG = false;

  // --- Helpers ---------------------------------------------------------------
  function normalize(s) {
    if (s === undefined || s === null) return '';
    return String(s).trim().toLowerCase().replace(/\s+/g,' ');
  }

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

  function hasSynthesisCategory(obj, category) {
    if (!obj || !category) return false;
    var want = normalize(category);
    if (obj.meta && typeof obj.meta === 'object') {
      for (var k in obj.meta) {
        if (!obj.meta.hasOwnProperty(k)) continue;
        var kn = k.toLowerCase().replace(/[\s_\-]/g,'');
        if (kn === 'synthesiscategory') {
          var val = normalize(obj.meta[k]);
          if (val === want) return true;
          if (val + 's' === want) return true;
          if (val.replace(/s$/,'') === want) return true;
        }
      }
    }
    var note = (obj.note || '').toString();
    if (!note) return false;
    var safe = function(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'); };
    var wantSafe = safe(category);
    var wantSing = want.replace(/s$/i,'');
    var reAngle = new RegExp('<\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*>', 'i');
    var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*(\\n|$)', 'i');
    return reAngle.test(note) || rePlain.test(note);
  }

  function buildCategoryList(category) {
    var out = [];
    if (!category) return out;
    if ($dataItems && Array.isArray($dataItems)) {
      for (var i = 1; i < $dataItems.length; i++) {
        var d = $dataItems[i];
        if (!d) continue;
        if (hasSynthesisCategory(d, category)) out.push(d);
      }
    }
    if ($dataWeapons && Array.isArray($dataWeapons)) {
      for (var j = 1; j < $dataWeapons.length; j++) {
        var w = $dataWeapons[j];
        if (!w) continue;
        if (hasSynthesisCategory(w, category)) out.push(w);
      }
    }
    if ($dataArmors && Array.isArray($dataArmors)) {
      for (var k = 1; k < $dataArmors.length; k++) {
        var a = $dataArmors[k];
        if (!a) continue;
        if (hasSynthesisCategory(a, category)) out.push(a);
      }
    }
    if (DEBUG) console.log('CustomSynthesis: built list for', category, 'count=', out.length);
    return out;
  }

  // -------------------------
  // Material parsing helpers
  // -------------------------
  function parseMaterialsTag(note) {
    var out = [];
    if (!note) return out;
    var m = note.match(/<\s*Synthesis\s+Materials\s*:\s*([^>]+)>/i);
    if (!m) return out;
    var list = m[1].split(',');
    for (var i = 0; i < list.length; i++) {
      var part = list[i].trim();
      var mm = part.match(/(\d+)\s*x\s*(\d+)/i) || part.match(/(\d+)\s*(\d+)/i);
      if (mm) {
        var id = parseInt(mm[1], 10);
        var qty = parseInt(mm[2], 10);
        if (!isNaN(id) && !isNaN(qty) && qty > 0) out.push({ id: id, qty: qty });
      }
    }
    return out;
  }

  function computeMaxCraftCount(materials) {
    if (!materials || materials.length === 0) return Infinity;
    var max = Infinity;
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var item = $dataItems[m.id] || null;
      var have = $gameParty.numItems(item);
      var possible = Math.floor(have / m.qty);
      if (possible < max) max = possible;
    }
    if (!isFinite(max)) return 0;
    return Math.max(0, max);
  }

  function consumeMaterials(materials, count) {
    if (!materials || materials.length === 0) return;
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var item = $dataItems[m.id] || null;
      var total = m.qty * count;
      if (item) $gameParty.loseItem(item, total, false);
    }
  }

  // --- Windows ---------------------------------------------------------------
  function Window_CustomRecipeList() {
    this.initialize.apply(this, arguments);
  }
  Window_CustomRecipeList.prototype = Object.create(Window_Selectable.prototype);
  Window_CustomRecipeList.prototype.constructor = Window_CustomRecipeList;

  Window_CustomRecipeList.prototype.initialize = function(x, y, width, height) {
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this._data = [];
    this.refresh();
    this.select(0);
  };

  Window_CustomRecipeList.prototype.maxItems = function() {
    return this._data ? this._data.length : 0;
  };

  Window_CustomRecipeList.prototype.item = function() {
    return this._data && this._data[this.index()];
  };

  Window_CustomRecipeList.prototype.setData = function(arr) {
    this._data = arr || [];
    this.refresh();
    this.select(0);
  };

  Window_CustomRecipeList.prototype.drawItem = function(index) {
    var item = this._data[index];
    if (!item) return;
    var rect = this.itemRectForText(index);
    var icon = item.iconIndex || 0;
    var name = item.name || 'Unnamed';
    this.drawIcon(icon, rect.x + 2, rect.y + 2);
    this.drawText(name, rect.x + 40, rect.y, rect.width - 40);
  };

  // Help window
  function Window_CustomRecipeHelp() {
    this.initialize.apply(this, arguments);
  }
  Window_CustomRecipeHelp.prototype = Object.create(Window_Base.prototype);
  Window_CustomRecipeHelp.prototype.constructor = Window_CustomRecipeHelp;

  Window_CustomRecipeHelp.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._item = null;
    this.refresh();
  };

  Window_CustomRecipeHelp.prototype.setItem = function(item) {
    this._item = item;
    this.refresh();
  };

  Window_CustomRecipeHelp.prototype.refresh = function() {
    this.contents.clear();
    if (!this._item) return;
    var name = this._item.name || '';
    var desc = this._item.description || '';
    this.drawText(name, 0, 0, this.contents.width, 'left');
    this.drawTextEx(desc, 0, this.lineHeight() + 4);
    var mats = parseMaterialsTag(this._item.note || '');
    if (mats && mats.length > 0) {
      var y = this.lineHeight() * 4 + 8;
      this.drawText('Materials:', 0, y, this.contents.width, 'left');
      y += this.lineHeight();
      for (var i = 0; i < mats.length; i++) {
        var m = mats[i];
        var matItem = $dataItems[m.id];
        var matName = matItem ? matItem.name : ('Item ' + m.id);
        var have = $gameParty.numItems(matItem || null);
        this.drawText(matName + ' x' + m.qty + ' (' + have + ')', 0, y, this.contents.width, 'left');
        y += this.lineHeight();
      }
    }
  };

  // -------------------------
  // Number input window
  // -------------------------
  function Window_CS_NumberInput() {
    this.initialize.apply(this, arguments);
  }
  Window_CS_NumberInput.prototype = Object.create(Window_Base.prototype);
  Window_CS_NumberInput.prototype.constructor = Window_CS_NumberInput;

  Window_CS_NumberInput.prototype.initialize = function(x, y, width, height, max, initial, productName, onConfirm, onCancel) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._max = Math.max(0, Math.floor(max) || 0);
    this._value = Math.max(1, Math.min(this._max, Math.floor(initial) || 1));
    this._productName = productName || '';
    this._onConfirm = typeof onConfirm === 'function' ? onConfirm : function() {};
    this._onCancel = typeof onCancel === 'function' ? onCancel : function() {};
    this.activate();
    this.refresh();
  };

  Window_CS_NumberInput.prototype.refresh = function() {
    this.contents.clear();
    var w = this.contents.width;
    var title = 'Craft how many ' + String(this._productName) + '?';
    this.drawText(title, 0, 0, w, 'center');
    this.drawText('Up to ' + String(this._max), 0, this.lineHeight(), w, 'center');
    var numY = this.lineHeight() * 2 + 8;
    var numText = String(this._value);
    this.contents.fontSize = 36;
    this.drawText(numText, 0, numY, w, 'center');
    this.contents.fontSize = Window_Base.prototype.standardFontSize.call(this);
    var hintY = numY + 44;
    this.drawText('← / → to change  OK to confirm  Cancel to abort', 0, hintY, w, 'center');
  };

  Window_CS_NumberInput.prototype.increase = function() {
    if (this._value < this._max) {
      this._value++;
      SoundManager.playCursor();
      this.refresh();
    } else {
      SoundManager.playBuzzer();
    }
  };

  Window_CS_NumberInput.prototype.decrease = function() {
    if (this._value > 1) {
      this._value--;
      SoundManager.playCursor();
      this.refresh();
    } else {
      SoundManager.playBuzzer();
    }
  };

  Window_CS_NumberInput.prototype.confirm = function() {
    SoundManager.playOk();
    this._onConfirm(this._value);
  };

  Window_CS_NumberInput.prototype.cancel = function() {
    SoundManager.playCancel();
    this._onCancel();
  };

  Window_CS_NumberInput.prototype.processHandling = function() {};

  Window_CS_NumberInput.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (!this.active) return;
    if (Input.isRepeated('left')) {
      this.decrease();
    } else if (Input.isRepeated('right')) {
      this.increase();
    }
    if (Input.isTriggered('ok')) {
      this.confirm();
    }
    if (Input.isTriggered('cancel')) {
      this.cancel();
    }
  };

  // --- Scene -----------------------------------------------------------------
  function Scene_CustomSynthesis() {
    this.initialize.apply(this, arguments);
  }
  Scene_CustomSynthesis.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_CustomSynthesis.prototype.constructor = Scene_CustomSynthesis;

  Scene_CustomSynthesis.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
    this._category = null;
    this._list = null;
    this._help = null;
    this._items = [];
    this._cs_numberPrompt = null;
  };

  Scene_CustomSynthesis.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight;
    var listW = Math.floor(ww * 0.6);
    var helpW = ww - listW;
    var listH = wh - this.fittingHeight(1) - 32;

    // create windows
    this._list = new Window_CustomRecipeList(0, 0, listW, listH);
    this._help = new Window_CustomRecipeHelp(listW, 0, helpW, listH);
    this.addWindow(this._list);
    this.addWindow(this._help);

    // bottom instruction window
    var bottom = new Window_Base(0, listH + 8, ww, this.fittingHeight(1) + 8);
    bottom.drawText('Press OK to craft (if materials). Press Cancel to return.', 0, 0, bottom.contentsWidth(), 'center');
    this.addWindow(bottom);

    var scene = this;

    // update help on selection
    this._list.update = (function(origUpdate){
      return function(){
        origUpdate.call(this);
        var it = this.item();
        if (scene._help) scene._help.setItem(it);
      };
    })(this._list.update);

    // OK handler: open craft prompt if materials exist, otherwise flash help
    this._list.processOk = function() {
      var it = this.item();
      if (!it) return;
      var rec = it;
      var mats = parseMaterialsTag(rec.note || '');
      var maxCount = computeMaxCraftCount(mats);
      if ((!mats || mats.length === 0) && maxCount === Infinity) maxCount = 99;
      if (maxCount <= 0) {
        SoundManager.playBuzzer();
        if (scene._help) scene._help.refresh();
        return;
      }

      // Clean up any existing prompt
      try {
        if (scene._cs_numberPrompt) {
          try { scene.removeChild(scene._cs_numberPrompt); } catch (e) {}
          scene._cs_numberPrompt = null;
        }
      } catch (e) {}

      // Create number input
      var promptH = 120;
      var promptY = Graphics.boxHeight - promptH - 8;
      var inputW = Math.min(520, Math.floor(Graphics.boxWidth * 0.7));
      var inputX = Math.floor((Graphics.boxWidth - inputW) / 2);
      var productName = rec.name || 'Item';

      var input = new Window_CS_NumberInput(
        inputX, promptY, inputW, promptH,
        maxCount, 1, productName,
        function(count) { // onConfirm
          try {
            consumeMaterials(mats, count);
            var product = $dataItems[rec.id] || null;
            if (product) $gameParty.gainItem(product, count, false);
            SoundManager.playOk();
            if (scene._help) scene._help.setItem(rec);
            if (scene._list) scene._list.refresh();
          } catch (e) {
            if (DEBUG) console.error('[CS] craft confirm error', e);
          } finally {
            try { if (scene._cs_numberPrompt) { scene.removeChild(scene._cs_numberPrompt); scene._cs_numberPrompt = null; } } catch (e) {}
            try { if (scene._list) scene._list.activate(); } catch (e) {}
          }
        },
        function() { // onCancel
          try { if (scene._cs_numberPrompt) { scene.removeChild(scene._cs_numberPrompt); scene._cs_numberPrompt = null; } } catch (e) {}
          try { if (scene._list) scene._list.activate(); } catch (e) {}
        }
      );

      if (scene && typeof scene.addChild === 'function') {
        scene.addChild(input);
        scene._cs_numberPrompt = input;
      } else {
        // fallback: craft 1
        try { input._onConfirm && input._onConfirm(1); } catch (e) {}
      }

      try { if (scene._list) scene._list.deactivate(); } catch (e) {}
    };

    // Cancel handler: return to previous scene; also ensure prompt removed
    this._list.processCancel = function() {
      SoundManager.playCancel();
      try {
        if (scene._cs_numberPrompt) {
          try { scene.removeChild(scene._cs_numberPrompt); } catch (e) {}
          scene._cs_numberPrompt = null;
        }
      } catch (e) {}
      SceneManager.pop();
    };

    // Bind handlers explicitly so OK does not fall back to a default that closes the scene
    try {
      if (this._list && typeof this._list.setHandler === 'function') {
        this._list.setHandler('ok', this._list.processOk.bind(this._list));
        this._list.setHandler('cancel', this._list.processCancel.bind(this._list));
      }
    } catch (e) {
      if (DEBUG) console.error('[CS] bind ok/cancel handlers error', e);
    }
  };

  // Defensive rebind in start to counter other plugins that may override handlers
  Scene_CustomSynthesis.prototype.start = (function(orig) {
    return function() {
      orig.call(this);
      try {
        if (this._list && typeof this._list.setHandler === 'function') {
          this._list.setHandler('ok', this._list.processOk.bind(this._list));
          this._list.setHandler('cancel', this._list.processCancel.bind(this._list));
        }
      } catch (e) {
        if (DEBUG) console.error('[CS] start rebind error', e);
      }
      if (this._list) this._list.activate();
    };
  })(Scene_CustomSynthesis.prototype.start);

  Scene_CustomSynthesis.prototype.setCategory = function(category) {
    this._category = category;
    this._items = buildCategoryList(category);
    if (this._list) this._list.setData(this._items);
    if (this._help) this._help.setItem(this._items[0] || null);
  };

  // Defensive cleanup: remove prompt if scene popped
  (function() {
    var _origPop = SceneManager.pop;
    SceneManager.pop = function() {
      try {
        var scene = SceneManager._scene;
        if (scene && scene._cs_numberPrompt) {
          try { scene.removeChild(scene._cs_numberPrompt); } catch (e) {}
          scene._cs_numberPrompt = null;
        }
      } catch (e) {}
      return _origPop.call(this);
    };
  })();

  // --- Public API -----------------------------------------------------------
  window.openCustomSynthesisCategory = function(category) {
    if (!category) return;
    if (CATEGORY_LIST.indexOf(category) < 0) {
      if (DEBUG) console.warn('openCustomSynthesisCategory: category not in default list:', category);
    }
    SceneManager.push(Scene_CustomSynthesis);
    setTimeout(function(){
      var s = SceneManager._scene;
      if (s && typeof s.setCategory === 'function') s.setCategory(category);
      else if (DEBUG) console.warn('CustomSynthesis: scene not ready to set category');
    }, 10);
  };

  if (DEBUG) console.log('CustomSynthesisCategories plugin (patched) loaded.');
})();

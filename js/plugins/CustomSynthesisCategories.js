/*:
 * @plugindesc Custom Synthesis Categories (read-only viewer). Use openCustomSynthesisCategory('Foods') etc. Does not rely on YEP scenes. @author You
 * @help
 * - Tag your recipes/items with: <Synthesis Category: Foods> (or Potions, Soups)
 * - Call openCustomSynthesisCategory('Foods') from a Common Event or script call.
 * - This scene lists matching items/recipes; it is read-only (no crafting).
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
    // meta check
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
    // note check
    var note = (obj.note || '').toString();
    if (!note) return false;
    var safe = function(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&'); };
    var wantSafe = safe(category);
    var wantSing = want.replace(/s$/i,'');
    var reAngle = new RegExp('<\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*>', 'i');
    var rePlain = new RegExp('(^|\\n)\\s*Synthesis\\s*Category\\s*:\\s*(?:' + wantSafe + '|' + wantSing + ')\\s*(\\n|$)', 'i');
    return reAngle.test(note) || rePlain.test(note);
  }

  // Build list of all data items that match category
  function buildCategoryList(category) {
    var out = [];
    if (!category) return out;
    // scan $dataItems for items with the notetag
    if ($dataItems && Array.isArray($dataItems)) {
      for (var i = 1; i < $dataItems.length; i++) {
        var d = $dataItems[i];
        if (!d) continue;
        if (hasSynthesisCategory(d, category)) out.push(d);
      }
    }
    // also scan weapons/armors if you use them as products
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
  };

  Scene_CustomSynthesis.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight;
    var listW = Math.floor(ww * 0.6);
    var helpW = ww - listW;
    var listH = wh - this.fittingHeight(1) - 32;
    this._list = new Window_CustomRecipeList(0, 0, listW, listH);
    this._help = new Window_CustomRecipeHelp(listW, 0, helpW, listH);
    this.addWindow(this._list);
    this.addWindow(this._help);

    // bottom instruction window
    var bottom = new Window_Base(0, listH + 8, ww, this.fittingHeight(1) + 8);
    bottom.drawText('Press OK to view details. Press Cancel to return.', 0, 0, bottom.contentsWidth(), 'center');
    this.addWindow(bottom);

    var scene = this;
    this._list.setHandler = this._list.setHandler || function(){}; // safe
    // selection handling
    this._list.update = (function(origUpdate){
      return function(){
        origUpdate.call(this);
        var it = this.item();
        if (scene._help) scene._help.setItem(it);
      };
    })(this._list.update);

    // OK handler: show details in help (already done) — placeholder for future craft action
    this._list.processOk = function() {
      var it = this.item();
      if (!it) return;
      // For now, just flash the help window to indicate selection
      if (scene._help) {
        scene._help.activate();
        scene._help.refresh();
      }
      SoundManager.playOk();
    };

    // Cancel handler: return to previous scene
    this._list.processCancel = function() {
      SoundManager.playCancel();
      SceneManager.pop();
    };
  };

  Scene_CustomSynthesis.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    if (this._list) this._list.activate();
  };

  Scene_CustomSynthesis.prototype.setCategory = function(category) {
    this._category = category;
    this._items = buildCategoryList(category);
    if (this._list) this._list.setData(this._items);
    if (this._help) this._help.setItem(this._items[0] || null);
  };

  // --- Public API -----------------------------------------------------------
  window.openCustomSynthesisCategory = function(category) {
    if (!category) return;
    if (CATEGORY_LIST.indexOf(category) < 0) {
      // allow any string but warn
      if (DEBUG) console.warn('openCustomSynthesisCategory: category not in default list:', category);
    }
    SceneManager.push(Scene_CustomSynthesis);
    // set category after next frame so scene exists
    setTimeout(function(){
      var s = SceneManager._scene;
      if (s && typeof s.setCategory === 'function') s.setCategory(category);
      else if (DEBUG) console.warn('CustomSynthesis: scene not ready to set category');
    }, 10);
  };

  // Optional: add a simple menu command (uncomment if you want it in main menu)
  // (If you enable this, move plugin below core menu code)
  /*
  var _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
  Window_MenuCommand.prototype.addOriginalCommands = function() {
    _Window_MenuCommand_addOriginalCommands.call(this);
    this.addCommand('Crafting', 'customCraft', true);
  };

  var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
  Scene_Menu.prototype.createCommandWindow = function() {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler('customCraft', function() {
      SceneManager.push(Scene_CustomSynthesis);
    });
  };
  */

  if (DEBUG) console.log('CustomSynthesisCategories plugin loaded. Use openCustomSynthesisCategory("Foods")');
})();

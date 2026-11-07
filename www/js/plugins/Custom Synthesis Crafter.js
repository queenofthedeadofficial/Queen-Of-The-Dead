/*:
 * @plugindesc QuickSynthesis Safe — one-per-material craft on OK for Foods/Potions/Soups with instance-only OK handlers and strict scene targeting. @author You
 * @help
 * - Tag items with: <Synthesis Category: Foods> (or Potions, Soups)
 * - Tag recipes with: <Synthesis Materials: 5x1, 7x1>
 * - Press OK on a recipe: if you have at least 1 of each material, consumes 1 of each and gives 1 product.
 * - This version avoids touching Item/KeyItem scenes and never overrides Window_Selectable.prototype globally.
 */

(function() {
  'use strict';

  var TARGET_CATEGORIES = ['foods','potions','soups'];
  var DEBUG = true;

  // Helpers
  function normalize(s) { if (s === undefined || s === null) return ''; return String(s).trim().toLowerCase().replace(/\s+/g,' '); }

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

  function parseCategoryTag(note) {
    if (!note) return null;
    var m = note.match(/<\s*Synthesis\s+Category\s*:\s*([^>]+)>/i);
    if (!m) return null;
    return String(m[1]).trim();
  }

  function itemHasTargetCategory(item) {
    if (!item) return false;
    var cat = parseCategoryTag(item.note || '');
    if (!cat) return false;
    return TARGET_CATEGORIES.indexOf(normalize(cat)) !== -1;
  }

  function canCraftOne(materials) {
    if (!materials || materials.length === 0) return false;
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var it = $dataItems[m.id] || null;
      if ($gameParty.numItems(it) < 1) return false;
    }
    return true;
  }

  function consumeOneEach(materials) {
    if (!materials || materials.length === 0) return;
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var it = $dataItems[m.id] || null;
      if (it) $gameParty.loseItem(it, 1, false);
    }
  }

  // Core crafting override for Window_CS_RecipeList if present
  function tryOverrideWindowCS() {
    try {
      if (typeof Window_CS_RecipeList === 'undefined' || !Window_CS_RecipeList.prototype || Window_CS_RecipeList.prototype._qs_ok_overridden) return false;
      Window_CS_RecipeList.prototype._qs_ok_overridden = true;
      var _origOk = Window_CS_RecipeList.prototype.processOk;
      Window_CS_RecipeList.prototype.processOk = function() {
        try {
          var rec = null;
          try { rec = (typeof this.item === 'function') ? this.item() : (this._data && this._data[this.index()]); } catch (e) { rec = null; }
          var scene = SceneManager._scene;
          var recipeObj = null;
          var productId = null;
          var note = '';
          if (rec && rec.item) {
            recipeObj = rec;
            note = rec.item && rec.item.note ? rec.item.note : '';
            productId = rec.id || (rec.item && rec.item.id) || null;
          } else if (rec && rec.note) {
            recipeObj = { item: rec, id: rec.id };
            note = rec.note;
            productId = rec.id || null;
          }
          if (recipeObj && recipeObj.item && itemHasTargetCategory(recipeObj.item)) {
            var mats = recipeObj.materials || parseMaterialsTag(note);
            if (mats && mats.length > 0 && canCraftOne(mats)) {
              consumeOneEach(mats);
              var product = null;
              if (productId && $dataItems[productId]) product = $dataItems[productId];
              else if (recipeObj.item && recipeObj.item.id && $dataItems[recipeObj.item.id]) product = $dataItems[recipeObj.item.id];
              if (product) $gameParty.gainItem(product, 1, false);
              SoundManager.playOk();
              try {
                if (scene && scene._help && typeof scene._help.setRecipe === 'function') scene._help.setRecipe(recipeObj);
                else if (scene && scene._help && typeof scene._help.setItem === 'function') scene._help.setItem(product);
              } catch (e) {}
              try { if (this.refresh) this.refresh(); } catch (e) {}
              return;
            }
          }
        } catch (e) { if (DEBUG) console.error('[QuickSynthesis] Window_CS_RecipeList processOk error', e); }
        if (_origOk) return _origOk.call(this);
      };
      if (DEBUG) console.log('[QuickSynthesis] patched Window_CS_RecipeList.processOk');
      return true;
    } catch (e) { if (DEBUG) console.error('[QuickSynthesis] tryOverrideWindowCS error', e); }
    return false;
  }

  // Instance-only installer for recipe-list windows
  function installInstanceWrapperIfRecipeList(win) {
    try {
      if (!win || typeof win !== 'object') return false;
      if (typeof win.setHandler !== 'function' || typeof win.processOk !== 'function') return false;
      if (!(window.Window_Base && win instanceof Window_Base)) return false;

      var ctorName = win.constructor && win.constructor.name ? win.constructor.name : '';
      var isKnownRecipeList = (ctorName === 'Window_CS_RecipeList' || ctorName === 'Window_RecipeList');

      var hasMaterialsTag = false;
      if (typeof win.item === 'function') {
        try {
          var it = win.item();
          var note = (it && it.item && it.item.note) ? it.item.note : (it && it.note) || '';
          if (note && /<\s*Synthesis\s+Materials\s*:/i.test(note)) hasMaterialsTag = true;
        } catch (e) { /* ignore */ }
      }

      if (!isKnownRecipeList && !hasMaterialsTag) return false;

      // Save original handler and mark
      if (!win._origOkHandler) {
        win._origOkHandler = win._handlers && win._handlers['ok'] ? win._handlers['ok'] : null;
        win._qs_installed = true;
      }

      // Guarded wrapper
      var wrapper = function() {
        try {
          var rec = (typeof this.item === 'function') ? this.item() : (this._data && this._data[this.index()]);
          if (!rec) return this._origOkHandler && this._origOkHandler();
          var note = (rec && rec.item && rec.item.note) ? rec.item.note : (rec && rec.note) || '';
          if (!note || !/<\s*Synthesis\s+Materials\s*:/i.test(note)) return this._origOkHandler && this._origOkHandler();
          var mats = rec.materials || (typeof parseMaterialsTag === 'function' ? parseMaterialsTag(note) : []);
          var cat = (note.match(/<\s*Synthesis\s+Category\s*:\s*([^>]+)>/i) || [])[1] || null;
          if (!cat || ['foods','potions','soups'].indexOf(String(cat).trim().toLowerCase()) === -1) return this._origOkHandler && this._origOkHandler();
          if (!Array.isArray(mats) || mats.length === 0) return this._origOkHandler && this._origOkHandler();
          if (!mats.every(function(m){ return $dataItems[m.id] && $gameParty.numItems($dataItems[m.id]) >= 1; })) return this._origOkHandler && this._origOkHandler();
          mats.forEach(function(m){ var it = $dataItems[m.id]; if (it) $gameParty.loseItem(it, 1, false); });
          var productId = rec.id || (rec.item && rec.item.id) || null;
          var product = productId && $dataItems[productId] ? $dataItems[productId] : (rec.item && rec.item.id && $dataItems[rec.item.id] ? $dataItems[rec.item.id] : null);
          if (product) $gameParty.gainItem(product, 1, false);
          SoundManager.playOk();
          try { if (this.refresh) this.refresh(); } catch(e){}
          return;
        } catch (e) {
          if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.error('[QuickSynthesis] instance wrapper error', e);
          return this._origOkHandler && this._origOkHandler();
        }
      }.bind(win);

      try { win.setHandler('ok', wrapper); } catch(e){}
      setTimeout(function(){ try { win.setHandler('ok', wrapper); } catch(e){} }, 60);
      if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.log('[QuickSynthesis] instance OK handler installed on', win.constructor && win.constructor.name);
      return true;
    } catch (e) { if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.error('installInstanceWrapperIfRecipeList error', e); return false; }
  }

  // Apply core override or rely on instance installers
  try {
    var applied = tryOverrideWindowCS();
    // Do not call any global wrapper; rely on instance installers below
  } catch (e) { if (DEBUG) console.error('[QuickSynthesis] initialization error', e); }

  // SceneManager.push installer that checks explicit candidate properties only
  (function(){
    var SYNTH_SCENES = ['Scene_CustomSynthesisStandalone','Scene_ItemSynthesis','Scene_Synthesis','Scene_CustomSynthesis'];
    var _origPush = SceneManager.push;
    SceneManager.push = function(sceneClass) {
      _origPush.call(this, sceneClass);
      try {
        setTimeout(function() {
          try {
            var scene = SceneManager._scene;
            if (!scene) return;
            var name = scene.constructor && scene.constructor.name ? scene.constructor.name : '';
            if (SYNTH_SCENES.indexOf(name) === -1) return;

            var candidates = ['_list','_recipeList','_itemWindow','_categoryWindow'];
            candidates.forEach(function(prop) {
              try {
                var win = scene[prop];
                if (!win || typeof win !== 'object') return;
                installInstanceWrapperIfRecipeList(win);
              } catch (e) { /* swallow per-window errors */ }
            });

            // Also call installInstanceWrapperIfRecipeList on a few common alternate properties
            ['_helpWindow','_help','_itemList','_window'].forEach(function(p){
              try { installInstanceWrapperIfRecipeList(scene[p]); } catch(e) {}
            });

          } catch (e) {}
        }, 40);
      } catch (e) {}
    };
  })();

  // Robust instance-level OK handler install (permanent) for direct calls
  (function(){
    function attemptCraftFromList(list) {
      try {
        if (!list) return false;
        var rec = (typeof list.item === 'function') ? list.item() : (list._data && list._data[list.index()]);
        if (!rec) return false;
        var recipeObj = null, note = '', productId = null;
        if (rec.item) { recipeObj = rec; note = rec.item && rec.item.note || ''; productId = rec.id || (rec.item && rec.item.id) || null; }
        else if (rec.note) { recipeObj = { item: rec, id: rec.id }; note = rec.note; productId = rec.id || null; }
        else return false;
        var m = (recipeObj.item && recipeObj.item.note) ? recipeObj.item.note.match(/<\s*Synthesis\s+Category\s*:\s*([^>]+)>/i) : null;
        var cat = m ? m[1].trim().toLowerCase() : null;
        if (!cat || ['foods','potions','soups'].indexOf(cat) === -1) return false;
        var mats = recipeObj.materials || (typeof parseMaterialsTag === 'function' ? parseMaterialsTag(note) : []);
        if (!Array.isArray(mats) || mats.length === 0) return false;
        if (!mats.every(function(mm){ return $dataItems[mm.id] && $gameParty.numItems($dataItems[mm.id]) >= 1; })) return false;
        mats.forEach(function(mm){ var it = $dataItems[mm.id]; if (it) $gameParty.loseItem(it, 1, false); });
        var product = (productId && $dataItems[productId]) ? $dataItems[productId] : (recipeObj.item && recipeObj.item.id && $dataItems[recipeObj.item.id] ? $dataItems[recipeObj.item.id] : null);
        if (product) $gameParty.gainItem(product, 1, false);
        SoundManager.playOk();
        try { if (list.refresh) list.refresh(); } catch(e){}
        return true;
      } catch (e) { if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.error('attemptCraftFromList error', e); return false; }
    }

    function installInstanceOk(scene) {
      try {
        var list = scene && (scene._list || scene._recipeList || scene._itemWindow);
        if (!list || typeof list.setHandler !== 'function') return;

        if (!list._origOkHandler) {
          list._origOkHandler = list._handlers && list._handlers['ok'] ? list._handlers['ok'] : null;
          list._qs_installed = true;
        }

        var wrapper = function() {
          try {
            var rec = (typeof this.item === 'function') ? this.item() : (this._data && this._data[this.index()]);
            if (!rec) return this._origOkHandler && this._origOkHandler();

            var note = (rec && rec.item && rec.item.note) ? rec.item.note : (rec && rec.note) || '';
            var mats = (rec && rec.materials) ? rec.materials : (typeof parseMaterialsTag === 'function' ? parseMaterialsTag(note) : []);
            var productId = (rec && rec.id) || (rec && rec.item && rec.item.id) || null;
            var cat = (rec && rec.item && rec.item.note) ? (rec.item.note.match(/<\s*Synthesis\s+Category\s*:\s*([^>]+)>/i) || [])[1] : (rec && rec.note ? (rec.note.match(/<\s*Synthesis\s+Category\s*:\s*([^>]+)>/i) || [])[1] : null);

            if (!cat || ['foods','potions','soups'].indexOf((cat||'').toLowerCase()) === -1) return this._origOkHandler && this._origOkHandler();
            if (!Array.isArray(mats) || mats.length === 0) return this._origOkHandler && this._origOkHandler();
            if (!mats.every(function(m){ return $dataItems[m.id] && $gameParty.numItems($dataItems[m.id]) >= 1; })) return this._origOkHandler && this._origOkHandler();

            mats.forEach(function(m){ var it = $dataItems[m.id]; if (it) $gameParty.loseItem(it, 1, false); });
            var product = (productId && $dataItems[productId]) ? $dataItems[productId] : (rec && rec.item && rec.item.id && $dataItems[rec.item.id] ? $dataItems[rec.item.id] : null);
            if (product) $gameParty.gainItem(product, 1, false);
            SoundManager.playOk();
            try { if (this.refresh) this.refresh(); } catch(e){}
            return;
          } catch (e) {
            if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.error('attemptCraftFromList wrapper error', e);
            return this._origOkHandler && this._origOkHandler();
          }
        }.bind(list);

        try { list.setHandler('ok', wrapper); } catch(e){}
        setTimeout(function(){ try { list.setHandler('ok', wrapper); } catch(e){} }, 60);

        if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.log('[QuickSynthesis] instance OK handler installed on', list.constructor && list.constructor.name);
      } catch (e) { if (window.QuickSynthesis && window.QuickSynthesis.DEBUG) console.error('installInstanceOk error', e); }
    }

    window.QuickSynthesis = window.QuickSynthesis || {};
    window.QuickSynthesis.installInstanceOk = installInstanceOk;
    window.QuickSynthesis.attemptCraftFromList = attemptCraftFromList;
  })();

  // Expose debug toggle
  try { window.QuickSynthesis = window.QuickSynthesis || {}; window.QuickSynthesis.DEBUG = DEBUG; } catch (e) {}

})();

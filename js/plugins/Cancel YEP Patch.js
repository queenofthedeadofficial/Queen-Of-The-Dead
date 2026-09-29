/*:
 * @plugindesc CS YEP Targeted Patch — ensures Cancel closes YEP/OpenSynthesis menus and runs CE 181; sorts recipe lists alphabetically. Place after YEP Item Synthesis. @author You
 * @help
 * - Patches Scene_ItemSynthesis and Scene_Synthesis create methods.
 * - Cancel will reserve Common Event 181 and close the scene.
 * - Recipe/item lists are sorted alphabetically by item name where possible.
 */

(function() {
  'use strict';

  var CANCEL_COMMON_EVENT_ID = 181;
  var DEBUG = false;

  // -------------------------
  // Helpers
  // -------------------------
  function safeReserveCommonEvent() {
    try {
      if (typeof $gameTemp !== 'undefined' && typeof $gameTemp.reserveCommonEvent === 'function') {
        $gameTemp.reserveCommonEvent(CANCEL_COMMON_EVENT_ID);
        return true;
      }
      if (typeof $gameSystem !== 'undefined' && typeof $gameSystem.reserveCommonEvent === 'function') {
        $gameSystem.reserveCommonEvent(CANCEL_COMMON_EVENT_ID);
        return true;
      }
      if ($dataCommonEvents && $dataCommonEvents[CANCEL_COMMON_EVENT_ID]) {
        var list = $dataCommonEvents[CANCEL_COMMON_EVENT_ID].list;
        var interpreter = new Game_Interpreter();
        interpreter.setup(list, 0);
        return true;
      }
    } catch (e) {
      if (DEBUG) console.error('[CS YEP Patch] reserveCommonEvent error', e);
    }
    return false;
  }

  function safePlayCancel() {
    try { SoundManager.playCancel(); } catch (e) {}
  }

  function isRecipeArray(arr) {
    if (!Array.isArray(arr)) return false;
    if (arr.length === 0) return false;
    var a = arr[0];
    return !!(a && (a.item || a.name || a.iconIndex));
  }

  function sortByNameArray(arr) {
    try {
      arr.sort(function(a, b) {
        var an = (a.item && a.item.name) ? a.item.name : (a.name || '');
        var bn = (b.item && b.item.name) ? b.item.name : (b.name || '');
        return String(an).localeCompare(String(bn));
      });
    } catch (e) {
      if (DEBUG) console.error('[CS YEP Patch] sort error', e);
    }
  }

  function wrapSetterForSorting(obj, methodName) {
    if (!obj || typeof obj[methodName] !== 'function') return;
    if (obj['_cs_sorted_' + methodName]) return;
    obj['_cs_sorted_' + methodName] = true;
    var orig = obj[methodName].bind(obj);
    obj[methodName] = function(data) {
      try {
        if (isRecipeArray(data)) sortByNameArray(data);
      } catch (e) {}
      return orig(data);
    };
    if (DEBUG) console.log('[CS YEP Patch] wrapped', methodName, 'on', obj.constructor && obj.constructor.name);
  }

  function patchWindowCancel(win) {
    if (!win || typeof win.processCancel !== 'function') return;
    if (win._cs_cancel_patched) return;
    win._cs_cancel_patched = true;

    var orig = win.processCancel.bind(win);
    win.processCancel = function() {
      safePlayCancel();
      try { safeReserveCommonEvent(); } catch (e) {}
      try {
        orig();
      } catch (e) {
        try { SceneManager.pop(); } catch (e2) {}
      }
    };
    if (DEBUG) console.log('[CS YEP Patch] patched cancel on', win.constructor && win.constructor.name);
  }

  // -------------------------
  // Targeted patch for Scene_ItemSynthesis
  // -------------------------
  function patchSceneCreate(sceneProto) {
    if (!sceneProto || sceneProto._cs_create_patched) return;
    sceneProto._cs_create_patched = true;

    var origCreate = sceneProto.create;
    sceneProto.create = function() {
      // call original create
      origCreate.call(this);

      // After creation, try to find common windows and patch them
      try {
        // Common YEP window property names to check
        var candidates = [
          '_itemWindow', '_itemListWindow', '_recipeWindow', '_recipeListWindow',
          '_listWindow', '_synthesisWindow', '_windowSynthesis', '_windowRecipe',
          '_categoryWindow', '_categoryListWindow', '_commandWindow'
        ];

        candidates.forEach(function(name) {
          try {
            var w = this[name];
            if (!w) return;
            // patch cancel
            patchWindowCancel(w);
            // wrap common setter names to sort lists
            wrapSetterForSorting(w, 'setData');
            wrapSetterForSorting(w, 'setItemList');
            wrapSetterForSorting(w, 'setRecipeList');
            wrapSetterForSorting(w, 'setCategoryList');
            wrapSetterForSorting(w, 'setList'); // generic
          } catch (e) {}
        }, this);

        // Defensive: also scan all properties on the scene for windows
        Object.keys(this).forEach(function(k) {
          try {
            var obj = this[k];
            if (!obj) return;
            if (typeof obj.processCancel === 'function') patchWindowCancel(obj);
            // wrap setters if present
            wrapSetterForSorting(obj, 'setData');
            wrapSetterForSorting(obj, 'setItemList');
            wrapSetterForSorting(obj, 'setRecipeList');
            wrapSetterForSorting(obj, 'setCategoryList');
            wrapSetterForSorting(obj, 'setList');
          } catch (e) {}
        }, this);

        // delayed pass in case YEP creates windows slightly later
        setTimeout(function(scene) {
          try {
            Object.keys(scene).forEach(function(k) {
              try {
                var obj = scene[k];
                if (!obj) return;
                if (typeof obj.processCancel === 'function') patchWindowCancel(obj);
                wrapSetterForSorting(obj, 'setData');
                wrapSetterForSorting(obj, 'setItemList');
                wrapSetterForSorting(obj, 'setRecipeList');
                wrapSetterForSorting(obj, 'setCategoryList');
                wrapSetterForSorting(obj, 'setList');
              } catch (e) {}
            });
          } catch (e) {}
        }, 80, this);

      } catch (e) {
        if (DEBUG) console.error('[CS YEP Patch] scene create patch error', e);
      }
    };
  }

  // Apply patches if the YEP scenes exist now, or wait and patch when they appear
  function ensurePatchScene(name) {
    try {
      if (typeof window[name] !== 'undefined') {
        patchSceneCreate(window[name].prototype);
        if (DEBUG) console.log('[CS YEP Patch] patched', name);
        return true;
      } else {
        // try again later
        var tries = 0;
        var id = setInterval(function() {
          tries++;
          if (typeof window[name] !== 'undefined') {
            patchSceneCreate(window[name].prototype);
            if (DEBUG) console.log('[CS YEP Patch] patched (delayed) ', name);
            clearInterval(id);
          } else if (tries > 100) {
            clearInterval(id);
          }
        }, 60);
      }
    } catch (e) {
      if (DEBUG) console.error('[CS YEP Patch] ensurePatchScene error for', name, e);
    }
  }

  ensurePatchScene('Scene_ItemSynthesis');
  ensurePatchScene('Scene_Synthesis');

  // Also patch custom standalone if present (defensive)
  ensurePatchScene('Scene_CustomSynthesisStandalone');

  // Expose a small debug function on window for manual patching if needed
  try {
    window._cs_patch_yep_now = function() {
      try {
        if (typeof Scene_ItemSynthesis !== 'undefined') patchSceneCreate(Scene_ItemSynthesis.prototype);
        if (typeof Scene_Synthesis !== 'undefined') patchSceneCreate(Scene_Synthesis.prototype);
        if (typeof Scene_CustomSynthesisStandalone !== 'undefined') patchSceneCreate(Scene_CustomSynthesisStandalone.prototype);
        console.log('[CS YEP Patch] manual patch applied');
      } catch (e) { console.error(e); }
    };
  } catch (e) {}

  if (DEBUG) console.log('[CS YEP Patch] loaded');
})();

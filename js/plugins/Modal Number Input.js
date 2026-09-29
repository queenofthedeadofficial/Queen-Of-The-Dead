/*:
 * @plugindesc QuickSynthesis Safe Modal — snapshots recipe list, blocks input during modal, sets v5000/v4999, and restores owner on exit
 * @author You
 * @help
 * Place this plugin after your custom synthesis plugin.
 * It protects the synthesis UI from being depopulated or left active while the craft quantity modal is open.
 */

(function(){
  'use strict';

  // --- In-memory snapshot storage
  var _qs_savedList = null;

  // --- Public API
  window.QuickSynthesis = window.QuickSynthesis || {};
  window.QuickSynthesis.saveListBeforeModal = function(owner){
    try { _qs_savedList = owner && Array.isArray(owner._data) ? owner._data.slice() : null; } catch(e){ _qs_savedList = null; }
  };
  window.QuickSynthesis.restoreListAfterModal = function(owner){
    try {
      if (!owner) return;
      if (_qs_savedList) {
        owner._data = _qs_savedList.slice();
        try { owner.refresh && owner.refresh(); } catch(e){}
        try { owner.activate && owner.activate(); } catch(e){}
        try { owner.select && owner.select(0); } catch(e){}
      } else {
        try { owner.makeItemList && owner.makeItemList(); } catch(e){}
        try { owner.makeRecipeList && owner.makeRecipeList(); } catch(e){}
        try { owner.refresh && owner.refresh(); } catch(e){}
      }
    } catch(e){}
    _qs_savedList = null;
  };

  // --- Modal guard helpers
  window.QuickSynthesis._modalInputGuard = false;
  window.QuickSynthesis.clearModalInputGuard = function(owner){
    try { window.QuickSynthesis._modalInputGuard = false; if (owner) { owner.activate && owner.activate(); owner.active = true; } } catch(e){}
  };

  // --- Wrap openCraftQuantityPrompt to set variables, snapshot, and guard
  (function(){
    var origOpen = window.QuickSynthesis.openCraftQuantityPrompt;
    window.QuickSynthesis.openCraftQuantityPrompt = function(rec, materials, product, onDone, ownerList){
      try {
        // compute least available from materials
        var least = Infinity;
        if (Array.isArray(materials)) {
          for (var i=0;i<materials.length;i++){
            var mm = materials[i];
            var it = $dataItems && $dataItems[mm.id];
            var c = it ? $gameParty.numItems(it) : 0;
            if (c < least) least = c;
          }
        }
        least = (least === Infinity) ? 0 : least;
        try { $gameVariables.setValue(5000, least); } catch(e){}

        // save and block
        try { window.QuickSynthesis.saveListBeforeModal(ownerList); } catch(e){}
        try {
          var owner = ownerList || (SceneManager._scene && (SceneManager._scene._list || SceneManager._scene._recipeList || SceneManager._scene._itemWindow));
          if (owner) { owner.deactivate && owner.deactivate(); owner.active = false; }
          window.QuickSynthesis._pendingCraft = window.QuickSynthesis._pendingCraft || {};
          window.QuickSynthesis._pendingCraft.ownerList = owner;
        } catch(e){}
        window.QuickSynthesis._modalInputGuard = true;

        // wrapped callback: restore owner and clear guard, then call original callback
        var wrapped = function(q){
          try { $gameVariables.setValue(4999, q); } catch(e){}
          try {
            var owner = window.QuickSynthesis._pendingCraft && window.QuickSynthesis._pendingCraft.ownerList;
            if (owner) {
              try { owner.refresh && owner.refresh(); } catch(e){}
              try { owner.activate && owner.activate(); owner.active = true; } catch(e){}
            }
          } catch(e){}
          window.QuickSynthesis._modalInputGuard = false;
          try { if (typeof onDone === 'function') onDone(q); } catch(e){ console.warn('QuickSynthesis wrapped onDone threw', e); }
          try { delete window.QuickSynthesis._pendingCraft; } catch(e){}
        };

        if (typeof origOpen === 'function') return origOpen.call(this, rec, materials, product, wrapped, ownerList);
        if (typeof Scene_CraftNumber === 'function') {
          window.QuickSynthesis._pendingCraft = { rec: rec, materials: materials, product: product, max: 1, onDone: wrapped, ownerList: ownerList };
          SceneManager.push(Scene_CraftNumber);
          return true;
        }
        wrapped(0);
        return false;
      } catch(e) {
        try { window.QuickSynthesis.restoreListAfterModal(ownerList); } catch(e){}
        try { window.QuickSynthesis._modalInputGuard = false; } catch(e){}
        if (typeof onDone === 'function') onDone(0);
        return false;
      }
    };
  })();

  // --- Defensive patching helpers for list input handling
  function patchProtoProcessHandling(proto){
    if (!proto || proto._qs_inputPatched) return false;
    proto._qs_inputPatched = true;
    var origProcess = proto.processHandling || function(){};
    proto.processHandling = function(){
      if (window.QuickSynthesis && window.QuickSynthesis._modalInputGuard) return;
      return origProcess.apply(this, arguments);
    };
    return true;
  }

  // Try patching common prototypes now
  try { if (typeof Window_Selectable !== 'undefined') patchProtoProcessHandling(Window_Selectable.prototype); } catch(e){}
  try { if (typeof Window_CS_RecipeList !== 'undefined') patchProtoProcessHandling(Window_CS_RecipeList.prototype); } catch(e){}

  // Deferred patcher: patch prototypes or the live owner instance if prototypes are not available yet
  (function deferredPatcher(){
    var attempts = 0;
    var maxAttempts = 40;
    var interval = setInterval(function(){
      attempts++;
      var patched = false;
      try {
        if (typeof Window_CS_RecipeList !== 'undefined') {
          patched = patchProtoProcessHandling(Window_CS_RecipeList.prototype) || patched;
        }
        if (typeof Window_Selectable !== 'undefined') {
          patched = patchProtoProcessHandling(Window_Selectable.prototype) || patched;
        }
        var s = SceneManager._scene;
        if (s) {
          var owner = s._list || s._recipeList || s._itemWindow || s._listWindow || s._recipesWindow;
          if (owner && !owner._qs_inputPatched) {
            try {
              owner._qs_inputPatched = true;
              owner._qs_orig_processHandling = owner.processHandling || function(){};
              owner.processHandling = function(){
                if (window.QuickSynthesis && window.QuickSynthesis._modalInputGuard) return;
                return owner._qs_orig_processHandling.apply(this, arguments);
              };
              // defensive: ensure isOpenAndActive returns false while guard is set
              owner._qs_orig_isOpenAndActive = owner.isOpenAndActive || function(){ return false; };
              owner.isOpenAndActive = function(){
                if (window.QuickSynthesis && window.QuickSynthesis._modalInputGuard) return false;
                return owner._qs_orig_isOpenAndActive.apply(this, arguments);
              };
              patched = true;
            } catch(e){}
          }
        }
      } catch(e){}
      if (patched || attempts >= maxAttempts) clearInterval(interval);
    }, 250);
  })();

  // --- Defensive number window placement and Scene_CraftNumber exit guards
  function installCraftNumberPatches(){
    if (typeof Scene_CraftNumber === 'undefined' || !Scene_CraftNumber.prototype) return false;

    // placement
    var _origCreate = Scene_CraftNumber.prototype.create;
    Scene_CraftNumber.prototype.create = function(){
      try { if (typeof _origCreate === 'function') _origCreate.call(this); } catch(e){}
      try {
        var w = this._numberWindow;
        if (w) {
          var h = (typeof w.height === 'number' && isFinite(w.height)) ? w.height : 72;
          var ww = (typeof w.width === 'number' && isFinite(w.width)) ? w.width : 68;
          var computedY = Math.floor((Graphics.boxHeight - h) / 2) - 24;
          w.x = Math.floor((Graphics.boxWidth - ww) / 2);
          w.y = isFinite(computedY) ? computedY : Math.floor(Graphics.boxHeight / 2) - 36;
          try { w.refresh && w.refresh(); } catch(e){}
          try { w.updatePlacement && w.updatePlacement(); } catch(e){}
          try { w.activate && w.activate(); } catch(e){}
        }
      } catch(e){}
    };

    // restore helper
    (function(){
      var proto = Scene_CraftNumber.prototype;
      function restoreOwner(ownerList){
        try {
          var owner = ownerList || (window.QuickSynthesis && window.QuickSynthesis._pendingCraft && window.QuickSynthesis._pendingCraft.ownerList) || (SceneManager._scene && (SceneManager._scene._list || SceneManager._scene._recipeList || SceneManager._scene._itemWindow));
          if (!owner) return;
          try { owner.refresh && owner.refresh(); } catch(e){}
          try { owner.activate && owner.activate(); owner.active = true; } catch(e){}
          window.QuickSynthesis && (window.QuickSynthesis._modalInputGuard = false);
        } catch(e){}
      }

      if (!proto._qs_finishPatched && proto.finish) {
        var _origFinish = proto.finish;
        proto.finish = function(q){
          try { _origFinish.call(this, q); } catch(e){}
          restoreOwner(this._ownerList);
          try { if (SceneManager._scene === this) SceneManager.pop(); } catch(e){}
        };
        proto._qs_finishPatched = true;
      }

      var cancelName = proto.processCancel ? 'processCancel' : (proto.onCancel ? 'onCancel' : null);
      if (cancelName && !proto._qs_cancelPatched) {
        var _origCancel = proto[cancelName];
        proto[cancelName] = function(){
          try { if (typeof _origCancel === 'function') _origCancel.apply(this, arguments); } catch(e){}
          restoreOwner(this._ownerList);
          try { if (SceneManager._scene === this) SceneManager.pop(); } catch(e){}
        };
        proto._qs_cancelPatched = true;
      }

      if (!proto._qs_terminatePatched && proto.terminate) {
        var _origTerminate = proto.terminate;
        proto.terminate = function(){
          try { _origTerminate.call(this); } catch(e){}
          restoreOwner(this._ownerList);
        };
        proto._qs_terminatePatched = true;
      }
    })();

    return true;
  }

  // Try to install craft number patches now or defer until available
  if (!installCraftNumberPatches()) {
    (function deferredCraftNumberPatch(){
      var attempts = 0;
      var maxAttempts = 40;
      var interval = setInterval(function(){
        attempts++;
        if (installCraftNumberPatches() || attempts >= maxAttempts) clearInterval(interval);
      }, 250);
    })();
  }

  // --- Debug helper
  window.QuickSynthesis.debugState = function(){
    try {
      var s = SceneManager._scene;
      var owner = s && (s._list || s._recipeList || s._itemWindow || s._listWindow || s._recipesWindow);
      console.log('QuickSynthesis debug: scene=', s && s.constructor && s.constructor.name,
                  'modalGuard=', !!window.QuickSynthesis._modalInputGuard,
                  'owner=', owner && owner.constructor && owner.constructor.name,
                  'owner._qs_inputPatched=', !!(owner && owner._qs_inputPatched));
    } catch(e){ console.warn(e); }
  };

  // --- Done
  console.log('QuickSynthesis Safe Modal plugin active');
})();

/*:
 * @plugindesc CS Global Cancel Fallback — ensures Cancel closes synthesis menus and reserves CE 181. Safe, scoped wrapper for Window_Selectable.processCancel. @author You
 */
(function() {
  'use strict';

  var CANCEL_COMMON_EVENT_ID = 181;
  var DEBUG = false;

  function reserveCancelCommonEvent() {
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
      if (DEBUG) console.error('[CS GlobalCancel] reserve error', e);
    }
    return false;
  }

  function safePlayCancel() {
    try { SoundManager.playCancel(); } catch (e) {}
  }

  function sceneLooksLikeSynthesis(scene) {
    if (!scene || typeof scene !== 'object') return false;
    try {
      var name = scene.constructor && scene.constructor.name ? scene.constructor.name.toLowerCase() : '';
      if (name.indexOf('synth') !== -1) return true; // Scene_Synthesis, Scene_ItemSynthesis, Scene_CustomSynthesisStandalone, etc.
      // fallback: scene exposes recipe-like data
      if (Array.isArray(scene._recipes) && scene._recipes.length >= 0) return true;
      // fallback: scene has a property named _list and that list looks like a recipe window
      if (scene._list && scene._list._data && Array.isArray(scene._list._data)) {
        var d = scene._list._data;
        if (d.length === 0) return true; // empty recipe lists still count
        var first = d[0];
        if (first && (first.item || first.name || first.iconIndex)) return true;
      }
    } catch (e) {
      if (DEBUG) console.error('[CS GlobalCancel] scene detection error', e);
    }
    return false;
  }

  // Wrap Window_Selectable.prototype.processCancel
  (function() {
    if (!Window_Selectable || !Window_Selectable.prototype) return;
    if (Window_Selectable.prototype._cs_global_cancel_wrapped) return;
    Window_Selectable.prototype._cs_global_cancel_wrapped = true;

    var _origProcessCancel = Window_Selectable.prototype.processCancel;
    Window_Selectable.prototype.processCancel = function() {
      // If the active scene looks like a synthesis scene, run our fallback behavior
      try {
        var scene = SceneManager._scene;
        if (sceneLooksLikeSynthesis(scene)) {
          // Play sound and reserve CE 181
          safePlayCancel();
          try { reserveCancelCommonEvent(); } catch (e) {}
          // Call original handler; if it doesn't close the scene, pop as fallback
          try {
            _origProcessCancel.call(this);
            // If scene still the same after original, pop it
            setTimeout(function() {
              try {
                if (SceneManager._scene === scene) {
                  try { SceneManager.pop(); } catch (e2) {
                    if (typeof Scene_Menu !== 'undefined') SceneManager.goto(Scene_Menu);
                    else if (typeof Scene_Map !== 'undefined') SceneManager.goto(Scene_Map);
                  }
                }
              } catch (e3) { if (DEBUG) console.error('[CS GlobalCancel] delayed pop error', e3); }
            }, 10);
            return;
          } catch (e) {
            // original threw — fallback to pop
            try { SceneManager.pop(); } catch (e2) {
              if (typeof Scene_Menu !== 'undefined') SceneManager.goto(Scene_Menu);
              else if (typeof Scene_Map !== 'undefined') SceneManager.goto(Scene_Map);
            }
            return;
          }
        }
      } catch (e) {
        if (DEBUG) console.error('[CS GlobalCancel] wrapper error', e);
      }
      // Default behavior for non-synthesis scenes
      return _origProcessCancel.call(this);
    };
    if (DEBUG) console.log('[CS GlobalCancel] Window_Selectable.processCancel wrapped');
  })();

})();

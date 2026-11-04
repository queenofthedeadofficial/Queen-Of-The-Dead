/*:
 * @plugindesc Alphabetize recipe/item lists in Synthesis scenes (underscores treated as spaces). Minimal and non-destructive.
 * @author Copilot
 * @help
 * Sorts Window_Selectable._data after it's built, but only when:
 *  - the active scene's constructor name contains "Synthesis"
 *  - and the window's constructor name looks like a recipe/category/list window
 *
 * If your synthesis plugin uses a different scene or window naming, adjust the
 * checks in inSynthesisScene() or looksLikeSynthesisWindow().
 */

(function() {
  'use strict';

  var _Window_Selectable_makeItemList = Window_Selectable.prototype.makeItemList;

  function inSynthesisScene() {
    var s = SceneManager._scene;
    return !!(s && s.constructor && String(s.constructor.name).indexOf('Synthesis') !== -1);
  }

  function looksLikeSynthesisWindow(win) {
    if (!win || !win.constructor) return false;
    var name = String(win.constructor.name || '');
    var keywords = ['Synthesis','Recipe','Craft','Ingredient','Result','Category','Command','List'];
    for (var i = 0; i < keywords.length; i++) {
      if (name.indexOf(keywords[i]) !== -1) return true;
    }
    return false;
  }

  function displayNameOf(item) {
    if (!item) return '';
    if (typeof item === 'string') return item.replace(/_/g,' ').toLowerCase();
    if (item.name) return String(item.name).replace(/_/g,' ').toLowerCase();
    if (item.text) return String(item.text).replace(/_/g,' ').toLowerCase();
    // fallback: try toString
    return String(item).replace(/_/g,' ').toLowerCase();
  }

  Window_Selectable.prototype.makeItemList = function() {
    // call original to populate _data
    _Window_Selectable_makeItemList.call(this);

    try {
      if (!inSynthesisScene()) return;
      if (!looksLikeSynthesisWindow(this)) return;
      if (!Array.isArray(this._data) || this._data.length === 0) return;

      // Only sort if at least one element looks like an object with a name/text or a string
      var hasNameLike = this._data.some(function(it) {
        return !!(it && (it.name || it.text) || typeof it === 'string');
      });
      if (!hasNameLike) return;

      // Stable-ish sort by display name (underscores treated as spaces), case-insensitive
      this._data.sort(function(a, b) {
        var an = displayNameOf(a);
        var bn = displayNameOf(b);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });

    } catch (e) {
      // fail silently to avoid breaking other systems
      if (typeof console !== 'undefined' && console.error) {
        console.error('Synthesis_Alphabetize error:', e);
      }
    }
  };

})();

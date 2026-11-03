/*:
 * @plugindesc Alphabetize recipe lists in Scene_Synthesis for Window_SynthesisList and Window_SynthesisIngredients only. Non-destructive.
 * @author Copilot
 * @help
 * - Runs only when SceneManager._scene.constructor.name === 'Scene_Synthesis'.
 * - Sorts the _data array for Window_SynthesisList and Window_SynthesisIngredients after it's built.
 * - Treats underscores as spaces for sorting so "Health_Potion_Soups" sorts as "Health Potion Soups".
 * - Does not modify database entries.
 */

(function() {
  'use strict';

  var TARGET_SCENE = 'Scene_Synthesis';

  function inSceneSynthesis() {
    var s = SceneManager._scene;
    return !!(s && s.constructor && String(s.constructor.name) === TARGET_SCENE);
  }

  function displayKeyOf(item) {
    if (!item) return '';
    if (typeof item === 'string') return item.replace(/_/g, ' ').toLowerCase();
    if (item.name) return String(item.name).replace(/_/g, ' ').toLowerCase();
    if (item.text) return String(item.text).replace(/_/g, ' ').toLowerCase();
    if (item.item && item.item.name) return String(item.item.name).replace(/_/g, ' ').toLowerCase();
    if (item.result && item.result.name) return String(item.result.name).replace(/_/g, ' ').toLowerCase();
    if (item.recipe && item.recipe.name) return String(item.recipe.name).replace(/_/g, ' ').toLowerCase();
    return String(item).replace(/_/g, ' ').toLowerCase();
  }

  function sortDataArray(data) {
    if (!Array.isArray(data) || data.length === 0) return;
    // Only sort if items look like they have names
    var looksLike = data.some(function(it) {
      return !!(it && (typeof it === 'string' || it.name || it.text || (it.item && it.item.name) || (it.result && it.result.name)));
    });
    if (!looksLike) return;
    data.sort(function(a, b) {
      var an = displayKeyOf(a);
      var bn = displayKeyOf(b);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  // Hook Window_SynthesisList.makeItemList if that class exists
  if (typeof Window_SynthesisList !== 'undefined' && Window_SynthesisList.prototype.makeItemList) {
    var _WSL_makeItemList = Window_SynthesisList.prototype.makeItemList;
    Window_SynthesisList.prototype.makeItemList = function() {
      _WSL_makeItemList.call(this);
      try {
        if (!inSceneSynthesis()) return;
        sortDataArray(this._data);
      } catch (e) {
        if (typeof console !== 'undefined' && console.error) console.error('Synthesis_Alphabetize (List) error:', e);
      }
    };
  }

  // Hook Window_SynthesisIngredients.makeItemList if that class exists
  if (typeof Window_SynthesisIngredients !== 'undefined' && Window_SynthesisIngredients.prototype.makeItemList) {
    var _WSI_makeItemList = Window_SynthesisIngredients.prototype.makeItemList;
    Window_SynthesisIngredients.prototype.makeItemList = function() {
      _WSI_makeItemList.call(this);
      try {
        if (!inSceneSynthesis()) return;
        sortDataArray(this._data);
      } catch (e) {
        if (typeof console !== 'undefined' && console.error) console.error('Synthesis_Alphabetize (Ingredients) error:', e);
      }
    };
  }

  // Fallback: if those classes are not present, try a conservative Window_Selectable.refresh hook
  // that only acts when in Scene_Synthesis and the window ctor name matches the synthesis windows.
  var _Window_Selectable_refresh = Window_Selectable.prototype.refresh;
  Window_Selectable.prototype.refresh = function() {
    _Window_Selectable_refresh.call(this);
    try {
      if (!inSceneSynthesis()) return;
      var ctor = this.constructor && this.constructor.name || '';
      if (ctor === 'Window_SynthesisList' || ctor === 'Window_SynthesisIngredients') {
        sortDataArray(this._data);
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('Synthesis_Alphabetize (fallback) error:', e);
    }
  };

})();

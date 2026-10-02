/*:
 * @plugindesc Alphabetize skills in the battle skill menu only. Minimal scope.
 * @help This plugin sorts the Window_SkillList items by skill name (case-insensitive)
 * but only when the current scene is the battle scene.
 */
(function(){
  'use strict';

  var _WSL_makeItemList = Window_SkillList.prototype.makeItemList;
  Window_SkillList.prototype.makeItemList = function() {
    _WSL_makeItemList.call(this);
    // Only sort when shown in battle (preserve menu ordering elsewhere)
    if (SceneManager._scene instanceof Scene_Battle && Array.isArray(this._data)) {
      this._data.sort(function(a, b) {
        if (!a || !b) return 0;
        // Use localeCompare for robust alphabetical ordering, case-insensitive
        var cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        return cmp !== 0 ? cmp : (a.id - b.id);
      });
    }
  };

})();

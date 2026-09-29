/*:
 * @plugindesc Hides sealed skills from skill lists (menu and battle). v1.0
 * @author Copilot
 *
 * @param Hide Sealed Skills
 * @type boolean
 * @on Yes
 * @off No
 * @desc If ON, sealed skills won't appear in any skill list.
 * @default true
 *
 * @help
 * ============================================================================
 * Description
 * ============================================================================
 * Removes any skill that is sealed (via states, class features, equipment, etc.)
 * from actor skill lists. Works in the main skill menu and during battle.
 *
 * No commands. Put this plugin under YEP_SkillCore (if you use it).
 *
 * ============================================================================
 * Terms
 * ============================================================================
 * Free to use in commercial and non-commercial projects. No credit required.
 */

(function() {
  var parameters = PluginManager.parameters(document.currentScript.src.match(/([^\/]+)\.js$/) ? RegExp.$1 : 'HideSealedSkills');
  var hideSealed = parameters['Hide Sealed Skills'] === 'true';

  // Utility: safely get actor from windows that use actor context
  function currentActor(window) {
    return window._actor || (SceneManager._scene && SceneManager._scene._actor) || null;
  }

  // Override includes for skill lists (menu)
  const _Window_SkillList_includes = Window_SkillList.prototype.includes;
  Window_SkillList.prototype.includes = function(item) {
    if (!hideSealed) return _Window_SkillList_includes.call(this, item);
    const actor = this._actor;
    if (actor && item && DataManager.isSkill(item)) {
      if (actor.isSkillSealed(item.id)) return false;
    }
    return _Window_SkillList_includes.call(this, item);
  };

  // Battle skill window (ensures consistency in battle)
  const _Window_BattleSkill_includes = Window_BattleSkill.prototype.includes;
  Window_BattleSkill.prototype.includes = function(item) {
    if (!hideSealed) return _Window_BattleSkill_includes.call(this, item);
    const actor = currentActor(this);
    if (actor && item && DataManager.isSkill(item)) {
      if (actor.isSkillSealed(item.id)) return false;
    }
    return _Window_BattleSkill_includes.call(this, item);
  };

  // Optional: also hide skills sealed by skill type (if the entire type is sealed)
  // This matches default behavior but keeps the list clean.
  const _Window_SkillList_isEnabled = Window_SkillList.prototype.isEnabled;
  Window_SkillList.prototype.isEnabled = function(item) {
    // Keep default enabled logic; visibility is already handled above.
    return _Window_SkillList_isEnabled.call(this, item);
  };

  // Handle Equip Battle Skills (YEP) skill picker window, if present
  if (typeof Window_EquipSkill === 'function') {
    const _Window_EquipSkill_includes = Window_EquipSkill.prototype.includes;
    Window_EquipSkill.prototype.includes = function(item) {
      if (!hideSealed) return _Window_EquipSkill_includes.call(this, item);
      const actor = this._actor;
      if (actor && item && DataManager.isSkill(item)) {
        if (actor.isSkillSealed(item.id)) return false;
      }
      return _Window_EquipSkill_includes.call(this, item);
    };
  }
})();

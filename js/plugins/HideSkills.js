/*:
 * @plugindesc Hide skills if specific weapons are equipped (MV fix for missing Hide Eval).
 * @author Copilot
 *
 * @help
 * Add <Hide If Weapon: x> to a skill's note box.
 * Replace x with the weapon ID(s) from the database.
 * Multiple IDs can be comma-separated.
 */

(function() {
  const tagRegex = /<Hide If Weapon:\s*([\d,\s]+)>/i;

  // Parse notetags once
  const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
  DataManager.isDatabaseLoaded = function() {
    if (!_DataManager_isDatabaseLoaded.call(this)) return false;
    if (!this._hideSkillWeaponParsed) {
      $dataSkills.forEach(skill => {
        if (!skill || !skill.note) return;
        const match = skill.note.match(tagRegex);
        if (match) {
          skill._hideWeaponIds = match[1].split(",").map(id => Number(id.trim()));
        }
      });
      this._hideSkillWeaponParsed = true;
    }
    return true;
  };

  function actorHasWeaponId(actor, ids) {
    if (!actor || !ids) return false;
    return actor.equips().some(gear => gear && DataManager.isWeapon(gear) && ids.includes(gear.id));
  }

  // Filter skills in menus
  const _Window_SkillList_includes = Window_SkillList.prototype.includes;
  Window_SkillList.prototype.includes = function(item) {
    if (item && item._hideWeaponIds) {
      const actor = this._actor || (BattleManager.actor && BattleManager.actor()) || null;
      if (actorHasWeaponId(actor, item._hideWeaponIds)) return false;
    }
    return _Window_SkillList_includes.call(this, item);
  };

  // Filter skills in battle command
  const _Window_ActorCommand_addSkillCommand = Window_ActorCommand.prototype.addSkillCommand;
  Window_ActorCommand.prototype.addSkillCommand = function(skill) {
    if (skill && skill._hideWeaponIds) {
      const actor = this._actor;
      if (actorHasWeaponId(actor, skill._hideWeaponIds)) return; // skip adding
    }
    _Window_ActorCommand_addSkillCommand.call(this, skill);
  };
})();

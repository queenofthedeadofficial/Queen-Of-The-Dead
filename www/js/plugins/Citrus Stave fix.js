/*:
 * @target MV MZ
 * @plugindesc Add skill type 7 to actors 1 and 3 while Citrus Stave or <grantWhiteMagic> is equipped.
 */

(() => {
  const TARGET_ACTORS = [1, 3];
  const TARGET_SKILL_TYPE = 7;
  const TARGET_NAME = 'Citrus Stave';
  const NOTE_TAG = 'grantWhiteMagic';

  function matchesTargetEquip(obj) {
    if (!obj) return false;
    if (obj.name === TARGET_NAME) return true;
    if (obj.meta && obj.meta[NOTE_TAG]) return true;
    if (obj.note && obj.note.includes(`<${NOTE_TAG}>`)) return true;
    try {
      const base = ($dataWeapons && $dataWeapons[obj.id]) || ($dataItems && $dataItems[obj.id]) || ($dataArmors && $dataArmors[obj.id]);
      if (base) {
        if (base.name === TARGET_NAME) return true;
        if (base.meta && base.meta[NOTE_TAG]) return true;
        if (base.note && base.note.includes(`<${NOTE_TAG}>`)) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // Add skill type to the actor's addedSkillTypes
  const _Game_Actor_addedSkillTypes = Game_Actor.prototype.addedSkillTypes;
  Game_Actor.prototype.addedSkillTypes = function() {
    const types = _Game_Actor_addedSkillTypes.call(this);
    try {
      if (TARGET_ACTORS.includes(this.actorId())) {
        const hasMatch = (this.weapons && this.weapons().some(matchesTargetEquip)) || false;
        if (hasMatch && types.indexOf(TARGET_SKILL_TYPE) === -1) {
          // return a new array with the extra type included
          return types.concat([TARGET_SKILL_TYPE]);
        }
      }
    } catch (e) {
      console.error('addedSkillTypes patch error', e);
    }
    return types;
  };

  console.log('Add-skilltype plugin loaded: Citrus Stave or <grantWhiteMagic> grants skill type 7 for actors 1 and 3.');
})();

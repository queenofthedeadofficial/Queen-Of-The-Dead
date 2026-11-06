/*:
 * @plugindesc Minimal Execute plugin — double physical/magical damage when weapon has notetag and target <=10% HP. (v1.0)
 * @author ChatGPT
 *
 * @help
 * Add one of these notetags to a weapon's notebox:
 *
 *   <Physical Execute>
 *   <Magical Execute>
 *
 * Behavior:
 * - If the attacker has a weapon with <Physical Execute>, any skill/item with hitType === 1 (Physical) will deal double damage
 *   to a target whose HP is <= 10% (checked per-target).
 * - If the attacker has a weapon with <Magical Execute>, any skill/item with hitType === 2 (Magical) will deal double damage
 *   to a target whose HP is <= 10% (checked per-target).
 * - The doubling only applies when the computed damage value is positive.
 *
 * Installation:
 * - Save this file as "MinimalExecute.js" and place it in your project's js/plugins folder.
 * - Enable the plugin in the Plugin Manager (no parameters required).
 *
 * Notes:
 * - Works per-target because damage is evaluated for each target separately.
 * - Uses the standard RPG Maker MV damage pipeline by aliasing makeDamageValue.
 * - Uses integer damage (Math.floor) to avoid fractional HP.
 *
 * No warranty. Backup your project before use.
 */

(function() {
  'use strict';

  var _ME_alias_makeDamageValue = Game_Action.prototype.makeDamageValue;
  Game_Action.prototype.makeDamageValue = function(target, critical) {
    // Compute base damage first
    var value = _ME_alias_makeDamageValue.call(this, target, critical);

    try {
      // Only modify positive damage
      if (typeof value !== 'number' || value <= 0) return value;

      var item = this.item(); // skill or item
      if (!item) return value;

      // hitType: 1 = Physical, 2 = Magical
      var hitType = item.hitType;

      // Resolve subject (attacker)
      var subject = this.subject ? this.subject() : null;
      if (!subject) return value;

      // Helper: check if subject has a weapon with a notetag
      var hasWeaponNotetag = function(tagRegex) {
        if (!subject.weapons) return false;
        var weps = subject.weapons();
        if (!weps || !weps.length) return false;
        for (var i = 0; i < weps.length; i++) {
          var w = weps[i];
          if (!w) continue;
          var note = w.note || '';
          if (tagRegex.test(note)) return true;
        }
        return false;
      };

      // Regexes for notetags (case-insensitive)
      var physicalTag = /<\s*Physical\s+Execute\s*>/i;
      var magicalTag  = /<\s*Magical\s+Execute\s*>/i;

      // Check per hit type and per subject weapons
      if (hitType === 1 && hasWeaponNotetag(physicalTag)) {
        if (target && typeof target.hpRate === 'function' && target.hpRate() <= 0.10) {
          return Math.floor(value * 2);
        }
      } else if (hitType === 2 && hasWeaponNotetag(magicalTag)) {
        if (target && typeof target.hpRate === 'function' && target.hpRate() <= 0.10) {
          return Math.floor(value * 2);
        }
      }
    } catch (e) {
      // Fail silently to avoid breaking damage pipeline; log for debugging
      if (typeof console !== 'undefined') console.error('MinimalExecute plugin error:', e);
    }

    return value;
  };
})();

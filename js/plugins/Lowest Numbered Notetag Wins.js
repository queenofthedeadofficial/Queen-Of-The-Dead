/*:
 * @plugindesc Execute the entire note field from the lowest DB weapon with the same name when using a normal Attack.
 * @help
 * - Finds DB weapons with the same name as the equipped weapon.
 * - Uses the lowest database ID match.
 * - Executes the ENTIRE note field as JavaScript.
 * - Execution locals:
 *     target
 *     subject
 *     value      (hpDamage)
 *     result
 *     thisAction
 *     item
 */

(function() {
  'use strict';

  function findLowestDbWeaponByName(name) {
    if (!name) return null;

    for (var i = 1; i < $dataWeapons.length; i++) {
      var w = $dataWeapons[i];
      if (!w) continue;

      if (w.name === name) {
        return w;
      }
    }

    return null;
  }

  function execCode(code, locals) {
    try {
      var fn = new Function(
        'target',
        'subject',
        'value',
        'result',
        'thisAction',
        'item',
        '"use strict";\n' + code
      );

      return fn(
        locals.target,
        locals.subject,
        locals.value,
        locals.result,
        locals.thisAction,
        locals.item
      );
    } catch (e) {
      console.error('WeaponNoteExecutor error:', e);
    }
  }

  const _Game_Action_apply = Game_Action.prototype.apply;

  Game_Action.prototype.apply = function(target) {
    _Game_Action_apply.call(this, target);

    try {
      if (!this.isAttack()) return;

      var subject = this.subject ? this.subject() : null;
      if (!subject) return;

      var weapon = subject.weapons ? subject.weapons()[0] : null;
      if (!weapon) return;

      var dbWeapon = findLowestDbWeaponByName(weapon.name);
      if (!dbWeapon) return;

      var result =
        target && target.result
          ? target.result()
          : this._result;

      var hpDamage =
        result && typeof result.hpDamage === 'number'
          ? result.hpDamage
          : 0;

      execCode(dbWeapon.note, {
        target: target,
        subject: subject,
        value: hpDamage,
        result: result,
        thisAction: this,
        item: dbWeapon
      });

    } catch (e) {
      console.error('WeaponNoteExecutor outer error:', e);
    }
  };

  console.log('WeaponNoteExecutor initialized');
})();
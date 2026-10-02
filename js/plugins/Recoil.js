(function() {
"use strict";

const RECOIL_REGEX = /<Recoil\s*:\s*(\d+)>|<Recoil\s+(\d+)>/i;

function getRecoil(obj) {
  if (!obj || !obj.note) return 0;
  const m = obj.note.match(RECOIL_REGEX);
  return m ? Number(m[1] || m[2] || 0) : 0;
}

function calculateRecoil(target) {
  let recoil = 0;
  if (!target) return 0;

  target.states().forEach(s => recoil += getRecoil(s));

  if (target.isActor && target.isActor()) {
    target.weapons().forEach(w => recoil += getRecoil(w));
    target.armors().forEach(a => recoil += getRecoil(a));
  }

  return recoil;
}

// Hook at the correct stage
const _Game_Action_apply = Game_Action.prototype.apply;

Game_Action.prototype.apply = function(target) {
  _Game_Action_apply.call(this, target);

  const subject = this.subject();
  if (!subject || !target) return;

  if (!this.isPhysical || !this.isPhysical()) return;

  const recoil = calculateRecoil(target);
  if (recoil <= 0) return;

  // IMPORTANT: modify result, not HP directly
  const result = subject.result();

  result.hpDamage += recoil;
  result.hpDamage = Math.max(result.hpDamage, 0); // keep MV safe

  subject.gainHp(-recoil);

  // Ensure ONE popup (not two)
  subject.startDamagePopup();
};

})();
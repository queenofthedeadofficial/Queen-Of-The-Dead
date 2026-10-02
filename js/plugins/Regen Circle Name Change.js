//=============================================================================
// Andrew_SlotRegenTargetName.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_SlotRegenTargetName = true;

var Andrew = Andrew || {};
Andrew.SlotRegenTargetName = Andrew.SlotRegenTargetName || {};

/*:
 * @plugindesc v1.00 Shows "Slot 1"-"Slot 4" instead of actor names in the
 * battle status/actor-select windows while targeting skill 162.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Skill 162 applies a slot-persistent regen state (see
 * Andrew_SlotRegenState.js), so during target selection for that skill both
 * of the following should show which SLOT you're aiming at rather than
 * which actor currently occupies it:
 *
 *   1) The party status/actor-select rows (Window_BattleStatus, inherited
 *      by Window_BattleActor).
 *   2) The top banner name (Window_Help, via YEP_BattleEngineCore's
 *      Window_Help.prototype.drawBattler / setBattler).
 *
 * Both are hooked here. Only while the currently-inputting action is skill
 * 162 do they show "Slot N" (based on the actor's index within
 * $gameParty.battleMembers()); every other skill/item/context falls through
 * to default behavior untouched.
 * ============================================================================
 */

Andrew.SlotRegenTargetName.TargetSkillId = 162;

Andrew.SlotRegenTargetName.Window_Help_drawBattler =
    Window_Help.prototype.drawBattler;
Window_Help.prototype.drawBattler = function(battler) {
  var action = BattleManager.inputtingAction();
  if (action && action.isSkill() && action.item() &&
      action.item().id === Andrew.SlotRegenTargetName.TargetSkillId) {
    var slot = $gameParty.battleMembers().indexOf(battler);
    if (slot >= 0) {
      var text = 'Slot ' + (slot + 1);
      var wx = 0;
      var wy = (this.contents.height - this.lineHeight()) / 2;
      this.drawText(text, wx, wy, this.contents.width, 'center');
      return;
    }
  }
  Andrew.SlotRegenTargetName.Window_Help_drawBattler.call(this, battler);
};
//=============================================================================
// Andrew_BlockTurnSkipCondition.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_BlockTurnSkipCondition = true;

var Andrew = Andrew || {};
Andrew.BTS = Andrew.BTS || {};
Andrew.BTS.version = 1.02;

//=============================================================================
/*:
 * @plugindesc v1.02 Blocks the YEP_BattleStatusWindow right-button shortcuts
 * that lead into the battle step, under a troop/switch condition.
 * @author Andrew
 *
 * @param Troop ID
 * @type number
 * @min 1
 * @desc The troop ID (from the database) this restriction applies to.
 * @default 8
 *
 * @param Switch A
 * @type switch
 * @desc First switch checked. If this OR Switch B OR Switch C is
 * OFF, the skip is blocked (assuming the troop condition is met).
 * @default 4988
 *
 * @param Switch B
 * @type switch
 * @desc Second switch checked. If this OR Switch A OR Switch C is
 * OFF, the skip is blocked (assuming the troop condition is met).
 * @default 4989
 *
 * @param Switch C
 * @type switch
 * @desc Third switch checked. If this OR Switch A OR Switch B is
 * OFF, the skip is blocked (assuming the troop condition is met).
 * @default 4990
 *
 * @param Play Buzzer SE
 * @type boolean
 * @on Play
 * @off Don't Play
 * @desc Play the buzzer sound effect when the skip is blocked?
 * @default true
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * YEP_BattleStatusWindow.js adds "right button" shortcuts that can lead
 * into the battle step without full manual input:
 *
 *   - Party command window: right/pagedown jumps straight to Fight.
 *   - Actor command window: right/pagedown skips the current actor's
 *     turn (no action chosen), which can finalize input and start the
 *     round's execution when used on the last actor.
 *
 * This plugin blocks BOTH of these (buzzing instead) whenever BOTH of the
 * following are true:
 *
 *   1. The party is currently fighting the configured Troop ID.
 *   2. Switch A is OFF, OR Switch B is OFF, OR Switch C is OFF.
 *
 * If either of those conditions is false (wrong troop, or all three
 * switches are ON), both shortcuts behave exactly as YEP_BattleStatusWindow
 * normally would (governed by its own parameters).
 *
 * ============================================================================
 * Requirements / Placement
 * ============================================================================
 *
 * This plugin requires YEP_BattleStatusWindow.js and must be placed BELOW
 * it in the Plugin Manager list.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.02:
 * - Restored the actor command window turn-skip block (isAllowRightCommand)
 * alongside the party command window block. Both right-key shortcuts that
 * can lead into the battle step are now covered.
 *
 * Version 1.01:
 * - Simplified condition to troop + three switches (removed the
 * actor/skill check from the original version).
 *
 * Version 1.00:
 * - Finished plugin.
 */
//=============================================================================

//=============================================================================
// Parameter Variables
//=============================================================================

Andrew.Parameters = PluginManager.parameters('Andrew_BlockTurnSkipCondition');
Andrew.BTS.Param = Andrew.BTS.Param || {};

Andrew.BTS.Param.TroopId = Number(Andrew.Parameters['Troop ID'] || 8);
Andrew.BTS.Param.SwitchA = Number(Andrew.Parameters['Switch A'] || 4988);
Andrew.BTS.Param.SwitchB = Number(Andrew.Parameters['Switch B'] || 4989);
Andrew.BTS.Param.SwitchC = Number(Andrew.Parameters['Switch C'] || 4990);
Andrew.BTS.Param.PlayBuzzer = eval(String(Andrew.Parameters['Play Buzzer SE']));

//=============================================================================
// Condition Check
//=============================================================================

Andrew.BTS.isTargetTroop = function() {
  if (!$gameTroop || !$gameTroop.troop()) return false;
  return $gameTroop.troop().id === Andrew.BTS.Param.TroopId;
};

Andrew.BTS.switchesAllowSkip = function() {
  var swA = $gameSwitches.value(Andrew.BTS.Param.SwitchA);
  var swB = $gameSwitches.value(Andrew.BTS.Param.SwitchB);
  var swC = $gameSwitches.value(Andrew.BTS.Param.SwitchC);
  return swA && swB && swC;
};

Andrew.BTS.shouldBlockSkip = function() {
  if (!Andrew.BTS.isTargetTroop()) return false;
  if (Andrew.BTS.switchesAllowSkip()) return false;
  return true;
};

//=============================================================================
// Scene_Battle
//=============================================================================

// Only the actor command window's turn-skip (isAllowRightCommand) is
// touched. Skipping any actor OTHER than the last one in the party just
// advances to the next actor as normal and is left completely alone.
// Skipping the LAST actor's turn is what finalizes input and starts the
// round executing -- that's the one case blocked here.

Andrew.BTS.Scene_Battle_isAllowRightCommand =
    Scene_Battle.prototype.isAllowRightCommand;
Scene_Battle.prototype.isAllowRightCommand = function() {
  if (Andrew.BTS.shouldBlockSkip(BattleManager.actor())) {
    if (Andrew.BTS.Param.PlayBuzzer) SoundManager.playBuzzer();
    return false;
  }
  return Andrew.BTS.Scene_Battle_isAllowRightCommand.call(this);
};

//=============================================================================
// End of File
//=============================================================================
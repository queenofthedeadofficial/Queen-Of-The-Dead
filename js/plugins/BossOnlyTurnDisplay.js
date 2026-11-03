//=============================================================================
// ADRI_BossOnlyTurnOrder.js
//=============================================================================

/*:
 * @plugindesc Only shows the turn order display in battles with a <Boss> enemy.
 *
 * @author Andrew
 *
 * @help
 * Requires YEP_X_TurnOrderDisplay.js. Place this plugin below it in the
 * Plugin Manager.
 *
 * Enemy Notetag:
 *   <Boss>
 *   Put this in the Note box of an enemy in the database. If at least one
 *   enemy in the battle's troop has the tag, the turn order display works
 *   as normal. If none do, the turn order display is never created and
 *   nothing is drawn for the whole battle.
 *
 * Notes:
 *   - The whole troop is checked, including enemies that have not appeared
 *     yet, so a hidden <Boss> enemy still turns the display on.
 *   - The check happens once when the display is created. Changing an enemy
 *     into a <Boss> enemy mid-battle will not turn the display on.
 */

var Imported = Imported || {};
Imported.ADRI_BossOnlyTurnOrder = true;

if (Imported.YEP_X_TurnOrderDisplay) {

Game_Troop.prototype.hasBossEnemy = function() {
  return this.members().some(function(enemy) {
    var data = enemy.enemy();
    return data && /<Boss>/i.test(data.note);
  });
};

ADRI_BossOnlyTurnOrder_Scene_Battle_createTurnOrderDisplay =
  Scene_Battle.prototype.createTurnOrderDisplay;
Scene_Battle.prototype.createTurnOrderDisplay = function() {
  if (!$gameTroop.hasBossEnemy()) {
    // An empty list keeps YEP_X_TurnOrderDisplay from trying to rebuild it.
    this._turnOrderDisplay = [];
    return;
  }
  ADRI_BossOnlyTurnOrder_Scene_Battle_createTurnOrderDisplay.call(this);
};

} else {
  console.log('ADRI_BossOnlyTurnOrder requires YEP_X_TurnOrderDisplay, loaded ' +
    'above it in the Plugin Manager.');
}
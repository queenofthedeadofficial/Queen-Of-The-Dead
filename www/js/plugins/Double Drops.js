console.log('DoubleDrops plugin loading...');

/*:
 * @plugindesc Duplicate enemy drops if any party member has armor with a configurable note tag. Debug logs optional.
 * @param NoteTag
 * @type string
 * @desc Note tag to look for on armor (case insensitive). Example: <DoubleDrops>
 * @default <DoubleDrops>
 * @param Debug
 * @type boolean
 * @desc Show console logs for debugging
 * @default false
 * @help
 * Add the configured note tag to an armor's Note box to enable doubling when that armor is equipped.
 */

(function() {
  var params = PluginManager.parameters('DoubleDrops') || {};
  var NOTE_TAG = String(params['NoteTag'] || '<DoubleDrops>');
  var DEBUG = String(params['Debug'] || 'false').toLowerCase() === 'true';

  function partyHasTaggedArmor() {
    try {
      return $gameParty.members().some(function(actor) {
        return actor.equips().some(function(eq) {
          return eq && eq.note && eq.note.toLowerCase().indexOf(NOTE_TAG.toLowerCase()) !== -1;
        });
      });
    } catch (e) {
      if (DEBUG) console.error('DoubleDrops party check error', e);
      return false;
    }
  }

  var _Game_Enemy_makeDropItems = Game_Enemy.prototype.makeDropItems;
  Game_Enemy.prototype.makeDropItems = function() {
    var drops = _Game_Enemy_makeDropItems.call(this);
    try {
      if (drops && drops.length > 0 && partyHasTaggedArmor()) {
        if (DEBUG) console.log('DoubleDrops active for enemy:', this.enemyId(), 'original drops:', drops);
        // Return duplicated drops (deep clone)
        var dup = JSON.parse(JSON.stringify(drops));
        var result = drops.concat(dup);
        if (DEBUG) console.log('DoubleDrops result:', result);
        return result;
      }
    } catch (e) {
      if (DEBUG) console.error('DoubleDrops plugin error:', e);
    }
    return drops;
  };
})();

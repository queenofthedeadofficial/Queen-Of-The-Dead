/*:
 * @plugindesc Hide player HP/MP bars in Window_InBattleStatus (YEP) — actors only
 * @author Copilot
 * @help
 * Place this plugin after YEP/ADRI. It prevents HP/MP gauges from drawing for
 * player actors in Window_InBattleStatus. To revert, disable the plugin.
 */
(function() {
  'use strict';

  var TARGET = 'Window_InBattleStatus';

  var cls = window[TARGET];
  if (!cls || !cls.prototype) {
    console.warn('HP/MP hide plugin: target class not found:', TARGET);
    return;
  }

  var proto = cls.prototype;

  // Save originals if not already saved
  if (!proto.__orig_drawActorHp) proto.__orig_drawActorHp = proto.drawActorHp;
  if (!proto.__orig_drawActorMp) proto.__orig_drawActorMp = proto.drawActorMp;

  // Replace drawActorHp: skip for player actors
  proto.drawActorHp = function(actor, x, y, width) {
    try {
      if (actor && typeof actor.isActor === 'function' && actor.isActor()) {
        return; // skip drawing HP gauge for player actors
      }
    } catch (e) {
      return proto.__orig_drawActorHp.call(this, actor, x, y, width);
    }
    return proto.__orig_drawActorHp.call(this, actor, x, y, width);
  };

  // Replace drawActorMp: skip for player actors
  proto.drawActorMp = function(actor, x, y, width) {
    try {
      if (actor && typeof actor.isActor === 'function' && actor.isActor()) {
        return; // skip drawing MP gauge for player actors
      }
    } catch (e) {
      return proto.__orig_drawActorMp.call(this, actor, x, y, width);
    }
    return proto.__orig_drawActorMp.call(this, actor, x, y, width);
  };

  // Optional helper to restore originals from console if needed
  window.__restoreInBattleStatusGauges = function() {
    if (proto.__orig_drawActorHp) proto.drawActorHp = proto.__orig_drawActorHp;
    if (proto.__orig_drawActorMp) proto.drawActorMp = proto.__orig_drawActorMp;
    console.log('Restored original drawActorHp/drawActorMp on', TARGET);
  };

  console.log('Player HP/MP hide patch applied to', TARGET);
})();

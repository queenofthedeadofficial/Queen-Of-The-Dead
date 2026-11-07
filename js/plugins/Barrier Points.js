/*=============================================================================
 BarrierPoints_Help_Fixed.js
 - Correctly syncs <BP> with selected battle actor
 - Fixes stale/cached barrier value issue
=============================================================================*/
(function() {
  'use strict';

  var reBP = /\\BP(?:\[(\d+)\])?|<BP(?:\[(\d+)\])?>/gi;

  // 🔥 ALWAYS fresh party source (no caching)
  function getActorFromBattleIndex(win) {
    var scene = SceneManager._scene;
    if (!(scene instanceof Scene_Battle)) return $gameParty.members()[0];

    var status = scene._statusWindow;
    if (!status) return $gameParty.members()[0];

    var index = status.index();
    var members = $gameParty.battleMembers();

    return members[index] || members[0] || null;
  }

  function getBarrierPoints(actor) {
    if (!actor) return 0;

    if (typeof actor.barrierPoints === 'function') {
      try {
        return Number(actor.barrierPoints()) || 0;
      } catch (e) {
        return 0;
      }
    }

    return 0;
  }

  function replaceBP(text, win) {
    if (!text || typeof text !== 'string') return text;

    return text.replace(reBP, function() {
      var actor = getActorFromBattleIndex(win);
      return String(getBarrierPoints(actor));
    });
  }

  var _convert = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _convert.call(this, text);
    return replaceBP(text, this);
  };

})();
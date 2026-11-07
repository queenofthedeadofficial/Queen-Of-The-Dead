/*:
 * @plugindesc Selectively hide status icons that would draw inside the Weakness/Immunity area (ADRI/YEP). 
 * @author Copilot
 *
 * @help
 * Place this plugin after ADRI and YEP plugins. Adjust SKIP_ZONE_TOP and SKIP_ZONE_BOTTOM
 * to match the vertical area (in pixels from the top of the window) where your Weakness/Immunity
 * labels are drawn. Icons drawn with a y coordinate inside that zone will be suppressed.
 */
(function() {
  'use strict';

  // --- Configuration: pixels from top of the window ---
  var SKIP_ZONE_TOP = 28;    // top edge of the area to suppress icons (px)
  var SKIP_ZONE_BOTTOM = 92; // bottom edge of the area to suppress icons (px)

  // Window classes to patch (add any other custom window class names if needed)
  var targets = [
    'Window_InBattleEnemyStatus',
    'Window_InBattleStatus',
    'Window_BattleStatus',
    'Window_InBattleEnemyStateList',
    'Window_BattleActor'
  ];

  function shouldSkipIconsForWindow(win, drawX, drawY) {
    if (!win) return false;
    // drawY may be undefined if caller didn't pass it; try to infer from window coords
    var localY = (typeof drawY === 'number') ? drawY : 0;
    // If drawY is global/canvas coords, convert to window-local by subtracting window.y
    // Many drawActorIcons calls pass local coords; this handles both cases conservatively.
    if (localY > 0 && localY > win.y) {
      localY = localY - win.y;
    }
    // If drawY is zero and we can't infer, be conservative and do not skip
    if (typeof localY !== 'number') return false;
    return (localY >= SKIP_ZONE_TOP && localY <= SKIP_ZONE_BOTTOM);
  }

  targets.forEach(function(name) {
    var cls = window[name];
    if (!cls || !cls.prototype) return;
    var proto = cls.prototype;
    if (proto.__selectiveIconPatch) return; // already patched

    // Keep original
    proto.__orig_drawActorIcons = proto.drawActorIcons;

    // New wrapper: skip only when drawing inside the configured vertical zone
    proto.drawActorIcons = function(battler, x, y, width) {
      try {
        if (shouldSkipIconsForWindow(this, x, y)) {
          // Skip drawing icons that would overlap the Weakness/Immunity area
          return;
        }
      } catch (e) {
        // If anything goes wrong, fall back to original behavior
        return proto.__orig_drawActorIcons.call(this, battler, x, y, width);
      }
      return proto.__orig_drawActorIcons.call(this, battler, x, y, width);
    };

    proto.__selectiveIconPatch = true;
    console.log('Selective icon suppression applied to', name);
  });

  // Expose a small helper to adjust the zone at runtime from the console:
  window.__ADRI_iconSkipZone = function(top, bottom) {
    if (typeof top === 'number') SKIP_ZONE_TOP = top;
    if (typeof bottom === 'number') SKIP_ZONE_BOTTOM = bottom;
    console.log('ADRI icon skip zone set to', SKIP_ZONE_TOP, SKIP_ZONE_BOTTOM);
  };

})();

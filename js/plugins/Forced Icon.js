/*:
 * @plugindesc Force all state icons to a single icon (default: 12). MV/MZ compatible.
 * @author 
 * @param ForcedIcon
 * @text Forced Icon Index
 * @type number
 * @min 0
 * @default 12
 * @help
 * Forces every state's iconIndex to the configured icon each time states() is read.
 * This affects only state icons; other icon usages are unchanged.
 */

(function() {
  var params = PluginManager ? PluginManager.parameters && PluginManager.parameters('') : null;
  // Read parameter robustly for both MV and MZ; fallback to 12
  var forced = 12;
  try {
    var p = PluginManager.parameters && PluginManager.parameters(document.currentScript && document.currentScript.src ? document.currentScript.src.split('/').pop().replace('.js','') : '');
    if (p && p.ForcedIcon !== undefined) forced = Number(p.ForcedIcon) || 12;
  } catch (e) {
    forced = 12;
  }

  // Backup original
  var _Game_Battler_states = Game_Battler.prototype.states;

  // Override to return copies with forced iconIndex
  Game_Battler.prototype.states = function() {
    var orig = _Game_Battler_states.call(this);
    if (!orig || !orig.length) return orig;
    // Return shallow copies so we don't mutate $dataStates
    return orig.map(function(s) {
      if (!s) return s;
      var copy = Object.create(s);
      copy.iconIndex = forced;
      return copy;
    });
  };
})();

/*:
 * @plugindesc Hide state icons above enemy sprites when state has <hideIcon:true> in its note. Minimal and targeted for MV.
 * @author Copilot
 * @help
 * Add <hideIcon:true> to a State's note to prevent its icon from appearing
 * above enemy battlers only. The state still shows in menus and windows.
 */

(function() {
  'use strict';

  // Helper: returns true if a state should be hidden above sprites
  function stateShouldHideIcon(state) {
    return !!(state && state.meta && state.meta.hideIcon === 'true');
  }

  // Ensure Sprite_Battler exists
  if (typeof Sprite_Battler === 'undefined') {
    console.warn('HideEnemyStateIcon: Sprite_Battler not found. Plugin not applied.');
    return;
  }

  // If Sprite_StateIcon exists, we'll call its setup with filtered icons.
  // Many MV variants use this._stateIconSprite.setup(icons) inside updateStateIcons.
  var _Sprite_Battler_updateStateIcons = Sprite_Battler.prototype.updateStateIcons;
  Sprite_Battler.prototype.updateStateIcons = function() {
    // If no battler or no state icon sprite, fallback to original
    if (!this._battler || !this._stateIconSprite) {
      return _Sprite_Battler_updateStateIcons.call(this);
    }

    try {
      // Get the original icons array (this uses Game_Battler.prototype.stateIcons)
      var icons = this._battler.stateIcons ? this._battler.stateIcons() : [];

      // If this is an enemy, filter out icons for states with <hideIcon:true>
      if (this._battler.isEnemy && this._battler.isEnemy()) {
        // We need to map icon indexes back to states to check meta.
        // Build a list of states in the same order as stateIcons() would produce.
        // Game_Battler.prototype.stateIcons() normally returns state.iconIndex for this.states()
        var states = this._battler.states ? this._battler.states() : [];
        // Filter states and keep their iconIndex if not flagged
        var filteredIcons = [];
        for (var i = 0; i < states.length; i++) {
          var st = states[i];
          if (!stateShouldHideIcon(st)) {
            filteredIcons.push(st.iconIndex);
          }
        }
        icons = filteredIcons;
      }

      // Call the original update but try to use the sprite's setup if available.
      // Many implementations call this._stateIconSprite.setup(icons).
      if (this._stateIconSprite && typeof this._stateIconSprite.setup === 'function') {
        this._stateIconSprite.setup(icons);
      } else {
        // Fallback: call original method (some plugins handle icons differently)
        _Sprite_Battler_updateStateIcons.call(this);
      }
    } catch (e) {
      // If anything goes wrong, fallback to original and log error
      console.error('HideEnemyStateIcon: error in updateStateIcons patch', e);
      _Sprite_Battler_updateStateIcons.call(this);
    }
  };

})();

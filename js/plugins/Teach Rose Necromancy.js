/*:
 * @plugindesc Permanently grant skill type 6 to actor 3 when switch 154 is ON. Saved with the game.
 * @author Copilot
 *
 * @help
 * No plugin commands. Edit the constants below to change actor, skill type, or switch IDs.
 */

(function() {
  // === Configuration ===
  var TARGET_ACTOR_ID = 3;   // actor ID to receive the skill type
  var TARGET_SKILL_TYPE = 6; // skill type ID to grant
  var TRIGGER_SWITCH_ID = 154; // switch that triggers the grant
  // =====================

  // --- ensure Game_Actor has a persistent container for added skill types ---
  var _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
  Game_Actor.prototype.initMembers = function() {
    _Game_Actor_initMembers.call(this);
    if (!this._addedSkillTypes) this._addedSkillTypes = [];
  };

  // Add helper methods to manage persistent skill types
  Game_Actor.prototype.addPersistentSkillType = function(typeId) {
    if (!this._addedSkillTypes) this._addedSkillTypes = [];
    if (this._addedSkillTypes.indexOf(typeId) === -1) {
      this._addedSkillTypes.push(typeId);
    }
  };

  Game_Actor.prototype.removePersistentSkillType = function(typeId) {
    if (!this._addedSkillTypes) return;
    var idx = this._addedSkillTypes.indexOf(typeId);
    if (idx !== -1) this._addedSkillTypes.splice(idx, 1);
  };

  Game_Actor.prototype.hasPersistentSkillType = function(typeId) {
    return this._addedSkillTypes && this._addedSkillTypes.indexOf(typeId) !== -1;
  };

  // --- extend skillTypes to include persistent additions ---
  var _Game_Actor_skillTypes = Game_Actor.prototype.skillTypes;
  Game_Actor.prototype.skillTypes = function() {
    var types = _Game_Actor_skillTypes.call(this);
    // copy so we don't mutate original
    var result = types.slice();
    if (this._addedSkillTypes && this._addedSkillTypes.length) {
      this._addedSkillTypes.forEach(function(t) {
        if (result.indexOf(t) === -1) result.push(t);
      });
    }
    return result;
  };

  // --- utility to apply the configured grant if conditions are met ---
  function applyGrantIfNeeded() {
    if (!$gameSwitches) return;
    if ($gameSwitches.value(TRIGGER_SWITCH_ID)) {
      var actor = $gameActors.actor(TARGET_ACTOR_ID);
      if (actor) actor.addPersistentSkillType(TARGET_SKILL_TYPE);
    }
  }

  // Apply on plugin initialization (in case switch already ON when plugin loads)
  var _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);
    // Defer until $gameSwitches and $gameActors exist
    // Use setTimeout 0 to run after engine init (safe and minimal)
    setTimeout(function() {
      applyGrantIfNeeded();
    }, 0);
  };

  // Apply on load (when a saved game is loaded)
  var _DataManager_onLoad = DataManager.onLoad;
  DataManager.onLoad = function(object) {
    _DataManager_onLoad.call(this, object);
    // After loading game objects, ensure grant is applied if switch is on
    if (object === $gameSystem) {
      // small delay to ensure $gameSwitches and $gameActors are ready
      setTimeout(function() {
        applyGrantIfNeeded();
      }, 0);
    }
  };

  // Watch for the switch being turned on during play
  var _Game_Switches_setValue = Game_Switches.prototype.setValue;
  Game_Switches.prototype.setValue = function(switchId, value) {
    _Game_Switches_setValue.call(this, switchId, value);
    if (switchId === TRIGGER_SWITCH_ID && value === true) {
      var actor = $gameActors.actor(TARGET_ACTOR_ID);
      if (actor) actor.addPersistentSkillType(TARGET_SKILL_TYPE);
    }
  };

})();

/*:
 * @plugindesc Two-turn fly/dig/dive style enemy attack with slot locking and telegraph support.
 * @author You
 *
 * @help
 * SKILL NOTETAGS (Enemy-only):
 *
 *   <Dive Setup>
 *     - Randomly selects a living party slot
 *     - Stores slot index on the enemy
 *     - Stores actor ID in a game variable for Common Events
 *
 *   <Dive Strike>
 *     - Attacks the previously stored party slot
 *     - Clears stored data after execution
 *
 * REQUIRED SETUP:
 *   - Create a game variable to store the actor ID
 *   - Default variable ID used below: 21
 *
 * COMMON EVENT TEXT EXAMPLE:
 *   The Alpha Slime bounced up high over \N[\V[21]]!
 */

(function() {

  // ===============================
  // CONFIG
  // ===============================
  const TARGET_ACTOR_VAR_ID = 128;

  // ===============================
  // DIVE SETUP (TURN 1)
  // ===============================
  const _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {

    const item = this.item();
    const subject = this.subject();

    if (item && item.meta.DiveSetup && subject && subject.isEnemy()) {

      const members = $gameParty.battleMembers()
        .map((actor, index) => ({ actor, index }))
        .filter(e => e.actor.isAlive());

      if (members.length > 0) {
        const choice = members[Math.floor(Math.random() * members.length)];

        // Store slot for delayed attack
        subject._diveTargetSlot = choice.index;

        // Store actor ID for Common Event messaging
        $gameVariables.setValue(TARGET_ACTOR_VAR_ID, choice.actor.actorId());
      }
    }

    _Game_Action_apply.call(this, target);
  };

  // ===============================
  // DIVE STRIKE (TURN 2)
  // ===============================
  const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
  Game_Action.prototype.makeTargets = function() {

    const item = this.item();
    const subject = this.subject();

    if (item && item.meta.DiveStrike && subject && subject.isEnemy()) {

      const slot = subject._diveTargetSlot;

      if (slot !== undefined) {

        const members = $gameParty.battleMembers();
        const target = members[slot];

        // Cleanup after strike
        subject._diveTargetSlot = undefined;
        $gameVariables.setValue(TARGET_ACTOR_VAR_ID, 0);

        if (target && target.isAlive()) {
          return [target];
        } else {
          return []; // miss if target is gone
        }
      }
    }

    return _Game_Action_makeTargets.call(this);
  };

})();
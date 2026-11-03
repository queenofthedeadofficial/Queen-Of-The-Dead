/*:
 * @plugindesc Seals all commands for Actor 14 except Skill Type 2, and within Skill Type 2 seals every skill except Skill 199, unless Switches 4988 and 4989 are both ON.
 * @author Andrew
 *
 * @help
 * Two layers of sealing for Actor 14, both gated by the same unlock check:
 *
 * 1. Actor Command Window: every command is disabled (Attack, Guard, Item,
 *    and every Skill Type other than Skill Type ID 2) except the Skill
 *    Type 2 command, which stays usable.
 *
 * 2. Skill List Window: once inside Skill Type 2's skill list, every skill
 *    is disabled except Skill ID 199.
 *
 * Actor 14 is fully unlocked (all commands and skills enabled normally,
 * subject to normal cost/state rules) whenever BOTH Switch 4988 and
 * Switch 4989 are ON. If either is OFF, both seal layers are back in
 * effect.
 *
 * This only affects Actor 14 specifically (by Actor ID). All other party
 * members are untouched.
 *
 * Sealing is layered on top of isCommandEnabled / isEnabled, so it
 * composes with other plugins' enable/disable logic (MP cost, sealed
 * states, etc.) rather than overriding it — anything already disabled
 * for another reason stays disabled regardless of switch state.
 *
 * Note: Window_SkillList is shared between the battle skill window and
 * the menu skill screen. As written, this seals Skill Type 2 for Actor 14
 * in both places. If you only want the seal to apply in battle, let me
 * know and I'll scope the skill-list hook to Scene_Battle only.
 */
(function() {
    'use strict';
    const SEALED_ACTOR_ID = 14;
    const ALLOWED_STYPE_ID = 2;
    const ALLOWED_SKILL_ID = 199;
    const UNLOCK_SWITCH_1 = 4988;
    const UNLOCK_SWITCH_2 = 4989;
    function isUnlocked() {
        return $gameSwitches.value(UNLOCK_SWITCH_1) && $gameSwitches.value(UNLOCK_SWITCH_2);
    }
    function isSealedActor(actor) {
        return actor && actor.actorId() === SEALED_ACTOR_ID;
    }
    function isAllowedCommand(command) {
        return command && command.symbol === 'skill' && command.ext === ALLOWED_STYPE_ID;
    }
    //--------------------------------------------------------------------------
    // Layer 1: Actor Command Window — only the Skill Type 2 entry is usable.
    //--------------------------------------------------------------------------
    const _Window_ActorCommand_isCommandEnabled = Window_ActorCommand.prototype.isCommandEnabled;
    Window_ActorCommand.prototype.isCommandEnabled = function(index) {
        const baseEnabled = _Window_ActorCommand_isCommandEnabled ?
            _Window_ActorCommand_isCommandEnabled.call(this, index) : true;
        if (!baseEnabled) return false;
        const actor = this._actor;
        if (!isSealedActor(actor) || isUnlocked()) {
            return baseEnabled;
        }
        const command = this._list[index];
        return isAllowedCommand(command);
    };
    //--------------------------------------------------------------------------
    // Layer 2: Skill List Window — only Skill 199 is usable within Skill Type 2.
    //--------------------------------------------------------------------------
    const _Window_SkillList_isEnabled = Window_SkillList.prototype.isEnabled;
    Window_SkillList.prototype.isEnabled = function(item) {
        const baseEnabled = _Window_SkillList_isEnabled.call(this, item);
        if (!baseEnabled) return false;
        if (!item) return baseEnabled;
        const actor = this._actor;
        if (!isSealedActor(actor) || isUnlocked()) {
            return baseEnabled;
        }
        if (item.stypeId !== ALLOWED_STYPE_ID) {
            return baseEnabled;
        }
        return item.id === ALLOWED_SKILL_ID;
    };
})();
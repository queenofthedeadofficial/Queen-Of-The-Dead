/*:
 * @plugindesc State 101 grants actors a one-time death save: full heal
 * instead of dying, then the state clears at the next turn if unused.
 * @author Andrew
 */

(function() {

const SAFETY_STATE_ID = 101;

// refresh() is where the engine actually decides "hp is 0, add the death
// state" -- intercepting here (rather than setHp) catches the moment of
// death regardless of what path reduced HP to 0, and survives other
// plugins that alias/override setHp along the way.
// refresh() is where the engine actually decides "hp is 0, add the death
// state" -- intercepting here (rather than setHp) catches the moment of
// death regardless of what path reduced HP to 0, and survives other
// plugins that alias/override setHp along the way.
const _Game_BattlerBase_refresh = Game_BattlerBase.prototype.refresh;
Game_BattlerBase.prototype.refresh = function() {
    if (this.isActor && this.isActor() &&
        this._hp <= 0 &&
        this.isStateAffected(SAFETY_STATE_ID)) {
        this._hp = this.mhp;
        this.eraseState(SAFETY_STATE_ID);
        // Don't touch _result or request a popup here -- the lethal hit's
        // own damage popup hasn't been read/created by the sprite yet at
        // this point, and overwriting hpDamage now would replace it
        // instead of showing both. Queue the heal instead; the sprite-side
        // hook below fires it once the lethal popup has actually gone out.
        this._deathSaveHealPending = this.mhp;
    }
    _Game_BattlerBase_refresh.call(this);
};

// Fires the queued heal popup only after the lethal hit's own popup has
// been consumed (isDamagePopupRequested() back to false), so the two
// display in sequence instead of the heal overwriting the lethal number.
const _Sprite_Battler_update = Sprite_Battler.prototype.update;
Sprite_Battler.prototype.update = function() {
    _Sprite_Battler_update.call(this);
    const battler = this._battler;
    if (battler &&
        battler._deathSaveHealPending &&
        !battler.isDamagePopupRequested()) {
        const amount = battler._deathSaveHealPending;
        battler._deathSaveHealPending = null;
        // A negative hpDamage value is what tells Sprite_Damage to render
        // it green as a heal rather than red as damage.
        battler._result.hpDamage = -amount;
        battler._result.hpAffected = true;
        battler.startDamagePopup();
    }
};

// If the state went unused, clear it at the start of the next turn.
const _BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
    $gameParty.members().forEach(function(actor) {
        if (actor.isStateAffected(SAFETY_STATE_ID)) {
            actor.removeState(SAFETY_STATE_ID);
        }
    });
    _BattleManager_startTurn.call(this);
};

})();
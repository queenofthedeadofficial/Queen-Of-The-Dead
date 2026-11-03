(function() {
"use strict";

const TARGET_PARAM = 4;
const TARGET_ACTOR = 16;
const CHECK_STATE = 244;

window.StatModifiers = window.StatModifiers || [];

window.StatModifiers.push(function(battler, paramId, value) {

    if (paramId !== TARGET_PARAM) return value;
    if (!battler.isActor()) return value;
    if (battler.actorId() !== TARGET_ACTOR) return value;

    const hasState = $gameParty.members().some(m =>
        m.isStateAffected(CHECK_STATE)
    );

    if (hasState) return value + 2;

    return value;
});

})();
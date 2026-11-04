(function() {

    // Checks if actor has at least one skill in a skill type
    function hasSkillsInType(actor, stypeId) {
        var skills = actor.skills();

        for (var i = 0; i < skills.length; i++) {
            var skill = skills[i];
            if (skill && skill.stypeId === stypeId) {
                return true;
            }
        }
        return false;
    }

    // Override CORE SOURCE of skill types (this affects MENU + BATTLE)
    var _Game_Actor_addedSkillTypes = Game_Actor.prototype.addedSkillTypes;

    Game_Actor.prototype.addedSkillTypes = function() {
        var result = _Game_Actor_addedSkillTypes.call(this);

        var filtered = [];

        for (var i = 0; i < result.length; i++) {
            var stypeId = result[i];
            if (hasSkillsInType(this, stypeId)) {
                filtered.push(stypeId);
            }
        }

        return filtered;
    };

})();
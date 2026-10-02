//=============================================================================
// Andrew_SkipLowMPActors.js
//=============================================================================

/*:
 * @plugindesc Allows queuing skills without MP in battle; displays message and skips turn on insufficient MP.
 * @author Andrew
 *
 * @help
 * In BATTLE: Skills without <Instant Cast> can be selected even with insufficient MP.
 * At execution: If the actor has enough MP, the skill executes normally. If not, a message
 * displays ("X tried to use Y!" / "But X didn't have enough mana!") and the actor's turn
 * is skipped. <Instant Cast> skills behave normally and are unaffected.
 *
 * Out of BATTLE: Normal RPGMV cost enforcement applies. Skills require sufficient
 * MP, TP, and HP to be selectable.
 *
 * Placement: Load AFTER YEP_SkillCore and other skill-modifying plugins.
 */

(function() {
    'use strict';

    // ============================================================
    // SINGLE SOURCE OF TRUTH - Battle-Specific MP Override
    // ============================================================
    Game_BattlerBase.prototype.skillPermission = function(skill) {
        if (!skill) return false;

        // --------------------------------------------------------
        // Hard rules (ONLY thing that truly disables a skill)
        // --------------------------------------------------------
        if (this.isSkillSealed(skill.id)) {
            return false;
        }
        if (this.isSkillTypeSealed(skill.stypeId)) {
            return false;
        }

        // --------------------------------------------------------
        // Out of battle: enforce normal RPGMV cost requirements
        // --------------------------------------------------------
        if (!$gameParty.inBattle()) {
            // Check HP, MP, TP costs normally
            if (this.hp <= 0) return false;
            if (this.mp < skill.mpCost) return false;
            if (this.tp < skill.tpCost) return false;
            return true;
        }

        // --------------------------------------------------------
        // In battle: flag Instant Cast but allow selection regardless
        // --------------------------------------------------------
        const instant = /<\s*Instant\s*Cast\s*>/i.test(skill.note || "");
        skill._isInstantCast = instant;

        return true; // Allow selection in battle even without MP
    };

    // ============================================================
    // OVERRIDE MV/YEP ENTRY POINTS
    // ============================================================

    // UI layer: use skillPermission for enabled/disabled state
    Window_SkillList.prototype.isEnabled = function(skill) {
        return this._actor ? this._actor.skillPermission(skill) : false;
    };

    // Core usability checks
    Game_BattlerBase.prototype.canUse = function(skill) {
        return this.skillPermission(skill);
    };

    Game_BattlerBase.prototype.meetsSkillConditions = function(skill) {
        return this.skillPermission(skill);
    };

    // Cost layer: always return true (enforcement happens at execution)
    Game_BattlerBase.prototype.canPaySkillCost = function(skill) {
        return true;
    };

    // ============================================================
    // ENFORCEMENT: Add state 93 if MP insufficient to prevent action
    // ============================================================
    var _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        if (this._subject && this._subject.currentAction()) {
            var action = this._subject.currentAction();
            var item = action.item();
            
            // Check if skill lacks MP before action starts
            if (action.isSkill() && item) {
                var isInstantCast = /<\s*Instant\s*Cast\s*>/i.test(item.note || "");
                
                if (!isInstantCast && this._subject.mp < item.mpCost) {
                    // Add to battle log
                    BattleManager._logWindow.addText(this._subject.name() + ' tried to use ' + item.name + '!');
                    BattleManager._logWindow.addText('But ' + this._subject.name() + ' didn\'t have enough mana!');
                    // Make log window transparent
                    BattleManager._logWindow.setBackgroundType(2);
                    BattleManager._logWindow.open();
                    // Keep log window open for extended time (120 frames ~= 3 seconds)
                    BattleManager._logWindow._waitCount = 120;
                    // Add state 93 to prevent action
                    this._subject.addState(93);
                    return;
                }
            }
        }
        
        return _BattleManager_startAction.call(this);
    };

})();
//=============================================================================
// Andrew_TargetLivingAndDead.js
//=============================================================================

/*:
 * @pluginname Andrew_TargetLivingAndDead
 * @target MV
 * @author Andrew
 *
 * @param Notetag
 * @text Notetag
 * @type text
 * @desc The notetag (no <> brackets) to place in a skill/item's note box
 * to enable targeting both living and dead allies.
 * @default Target Any Life State
 *
 * @help
 * ============================================================================
 * Andrew_TargetLivingAndDead.js
 * ============================================================================
 *
 * Allows a tagged friend-scope skill/item to target BOTH living and dead allies.
 *
 * Additionally, manually selected targets are locked at selection time.
 * This allows queued revives to resolve on the original target even if that
 * actor dies before the action executes.
 *
 * ============================================================================
 */

(function() {

    var parameters = PluginManager.parameters('Andrew_TargetLivingAndDead');
    var TAG_NAME = String(parameters['Notetag'] || 'Target Any Life State');


    //-------------------------------------------------------------------------
    // Helper
    //-------------------------------------------------------------------------

    var hasLivingDeadTag = function(item) {
        return !!(item && item.meta && item.meta[TAG_NAME]);
    };

    var isPlayerAction = function(action) {
        var subject = action.subject();
        return !!(subject && subject.isActor());
    };


    //-------------------------------------------------------------------------
    // Ignore alive/dead restrictions
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_testLifeAndDeath =
        Game_Action.prototype.testLifeAndDeath;

    Game_Action.prototype.testLifeAndDeath = function(target) {

        if (this.item() && isPlayerAction(this) && this.isForFriend() && hasLivingDeadTag(this.item())) {
            return true;
        }

        return Andrew_TLD_Game_Action_testLifeAndDeath.call(this, target);
    };


    //-------------------------------------------------------------------------
    // Allow living + dead candidates
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_itemTargetCandidates =
        Game_Action.prototype.itemTargetCandidates;

    Game_Action.prototype.itemTargetCandidates = function() {

        if (this.item() &&
            isPlayerAction(this) &&
            this.isValid() &&
            this.isForFriend() &&
            hasLivingDeadTag(this.item())) {

            return this.friendsUnit().members();
        }

        return Andrew_TLD_Game_Action_itemTargetCandidates.call(this);
    };


    //-------------------------------------------------------------------------
    // Prevent target validity from failing
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_testApply =
        Game_Action.prototype.testApply;

    Game_Action.prototype.testApply = function(target) {

        if (this.item() && isPlayerAction(this) && this.isForFriend() && hasLivingDeadTag(this.item())) {
            return true;
        }

        return Andrew_TLD_Game_Action_testApply.call(this, target);
    };


    //-------------------------------------------------------------------------
    // Prevent YEP validity checks from rejecting the action
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_isValid =
        Game_Action.prototype.isValid;

    Game_Action.prototype.isValid = function() {

        if (this.item() && isPlayerAction(this) && this.isForFriend() && hasLivingDeadTag(this.item())) {
            return true;
        }

        return Andrew_TLD_Game_Action_isValid.call(this);
    };


    //-------------------------------------------------------------------------
    // Lock manually selected target
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_setTarget =
        Game_Action.prototype.setTarget;

    Game_Action.prototype.setTarget = function(index) {

        Andrew_TLD_Game_Action_setTarget.call(this, index);

        if (this.item() && isPlayerAction(this) && this.isForFriend() && hasLivingDeadTag(this.item())) {

            var target = this.friendsUnit().members()[index];

            if (target) {
                this._lockedLifeStateTarget = target;
            }
        }
    };


    //-------------------------------------------------------------------------
    // Use locked target when action resolves
    //-------------------------------------------------------------------------

    var Andrew_TLD_Game_Action_makeTargets =
        Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function() {

        if (this._lockedLifeStateTarget &&
            this.item() &&
            isPlayerAction(this) &&
            this.isForFriend() &&
            hasLivingDeadTag(this.item())) {

            return [this._lockedLifeStateTarget];
        }

        return Andrew_TLD_Game_Action_makeTargets.call(this);
    };


})();
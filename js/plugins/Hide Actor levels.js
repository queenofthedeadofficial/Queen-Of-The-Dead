/*:
 * @plugindesc Hide the level in the upper Status window for all actors.
 * @author ChatGPT
 *
 * @help
 * Place this plugin BELOW YEP_StatusMenuCore.
 */
(function() {
    Window_SkillStatus.prototype.drawActorSimpleStatus = function(actor, x, y, width) {
        var lineHeight = this.lineHeight();
        var x2 = x + 180;
        var width2 = Math.min(200, width - 180 - this.textPadding());
        this.drawActorName(actor, x2, y);
        // Level is hidden for all actors.
        this.drawActorIcons(actor, x2, y + lineHeight * 2);
        this.drawActorHp(actor, x2 + 0, y + lineHeight);
        this.drawActorMp(actor, x2 + 0, y + lineHeight * 2);
    };
})();
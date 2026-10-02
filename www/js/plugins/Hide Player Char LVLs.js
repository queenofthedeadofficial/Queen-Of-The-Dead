/*:
 * @plugindesc Hides the level display for actors 1–3 in all UI scenes (battle, menus, status). Leveling still occurs internally. @author
 */

(function() {

    // Preserve original drawActorLevel
    const _Window_Base_drawActorLevel = Window_Base.prototype.drawActorLevel;
    Window_Base.prototype.drawActorLevel = function(actor, x, y) {
        if (actor && [1, 2, 3].includes(actor.actorId())) {
            // Skip drawing level
            return;
        }
        _Window_Base_drawActorLevel.call(this, actor, x, y);
    };

    // Status scene block: only draws level for actors outside 1–3
    const _Window_Status_drawBlock1 = Window_Status.prototype.drawBlock1;
    Window_Status.prototype.drawBlock1 = function(y) {
        const actor = this._actor;
        const lineHeight = this.lineHeight();
        this.drawActorName(actor, 0, y);
        this.drawActorClass(actor, 0, y + lineHeight * 1);

        // If original draws more (plugins), keep their behavior, but gate level calls
        if (!actor || ![1, 2, 3].includes(actor.actorId())) {
            this.drawActorLevel(actor, 0, y + lineHeight * 2);
        }
    };

    // Main menu simple status: same conditional draw
    const _Window_MenuStatus_drawActorSimpleStatus = Window_MenuStatus.prototype.drawActorSimpleStatus;
    Window_MenuStatus.prototype.drawActorSimpleStatus = function(actor, x, y, width) {
        const lineHeight = this.lineHeight();
        const x2 = x + 180;
        const width2 = Math.max(200, width - 180 - this.textPadding());
        this.drawActorName(actor, x, y);
        this.drawActorClass(actor, x, y + lineHeight * 1);
        this.drawActorHp(actor, x2, y);
        this.drawActorMp(actor, x2, y + lineHeight * 1);

        if (!actor || ![1, 2, 3].includes(actor.actorId())) {
            this.drawActorLevel(actor, x2, y + lineHeight * 2);
        }
    };

    // IMPORTANT: Do NOT override Window_BattleStatus.drawItem.
    // Rationale: YEP and other plugins redefine battle status layout and methods.
    // Our global drawActorLevel gate safely suppresses level wherever it's used,
    // and avoids conflicts with different rect APIs (e.g., no itemRectWithPadding).

})();

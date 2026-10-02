//=============================================================================
// Minimal Victory Drop Description Window
// Place BELOW YEP_VictoryAftermath.js
//=============================================================================

/*:
 * @plugindesc Replaces the Victory Drops title with item descriptions and
 * shifts the drops window downward for more description space.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * During the YEP_VictoryAftermath Drops screen:
 *
 * - The top title window displays the selected item's description.
 * - The title window is taller to better support multi-line descriptions.
 * - The drops window is shifted downward accordingly.
 * - Gold displays the default "Battle Spoils" text.
 * - Empty descriptions fall back to the item name.
 *
 * Place BELOW YEP_VictoryAftermath.js
 * ============================================================================
 */

(function() {

    //--------------------------------------------------------------------------
    // Make title window taller
    //--------------------------------------------------------------------------

    Window_VictoryTitle.prototype.windowHeight = function() {
        return this.fittingHeight(2); // was 1
    };

    //--------------------------------------------------------------------------
    // Allow multiline text in title window
    //--------------------------------------------------------------------------

    Window_VictoryTitle.prototype.refresh = function(text) {
        this.contents.clear();
        this.drawTextEx(text, this.textPadding(), 0);
    };

    //--------------------------------------------------------------------------
    // Move EXP window downward to match new title height
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.initialize = function() {
        var wy = this.fittingHeight(2); // was fittingHeight(1)
        var width = this.windowWidth();
        var height = this.windowHeight();
        this._showGainedSkills = eval(Yanfly.Param.VAShowSkills);

        Window_Selectable.prototype.initialize.call(
            this,
            0,
            wy,
            width,
            height
        );

        this.defineTickSound();
        this.refresh();
        AudioManager.playSe(this._tickSound);
        this._tick = 0;
        this.openness = 0;
    };

    //--------------------------------------------------------------------------
    // Reduce EXP window height accordingly
    //--------------------------------------------------------------------------

    Window_VictoryExp.prototype.windowHeight = function() {
        return Graphics.boxHeight - this.fittingHeight(2);
    };

    //--------------------------------------------------------------------------
    // Update drop descriptions dynamically
    //--------------------------------------------------------------------------

    var _Scene_Battle_updateVictoryDrops =
        Scene_Battle.prototype.updateVictoryDrops;

    Scene_Battle.prototype.updateVictoryDrops = function() {
        _Scene_Battle_updateVictoryDrops.call(this);

        if (!this._victoryDropWindow) return;
        if (!this._victoryTitleWindow) return;

        var item = this._victoryDropWindow.item();

        if (!item) {
            this._victoryTitleWindow.refresh(
                Yanfly.Param.VABattleDrops
            );
            return;
        }

        // Gold entry
        if (item === 'gold') {
            this._victoryTitleWindow.refresh(
                Yanfly.Param.VABattleDrops
            );
            return;
        }

        // Description text
        var text = item.description;

        // Fallback if empty
        if (!text || text.trim() === '') {
            text = item.name;
        }

        this._victoryTitleWindow.refresh(text);
    };

})();
/*:
 * @plugindesc Party Command Tooltips v2.0 (simple top-screen version)
 * @author ChatGPT
 */

(function() {

    // ------------------------------------------------------------
    // Tooltip Window
    // ------------------------------------------------------------

    function Window_PartyCommandTooltip() {
        this.initialize.apply(this, arguments);
    }

    Window_PartyCommandTooltip.prototype =
        Object.create(Window_Base.prototype);

    Window_PartyCommandTooltip.prototype.constructor =
        Window_PartyCommandTooltip;

    Window_PartyCommandTooltip.prototype.initialize = function() {

        // Fixed top-of-screen placement (like help window)
        var x = 0;
        var y = 0;
        var w = Graphics.boxWidth;
        var h = this.fittingHeight(2);

        Window_Base.prototype.initialize.call(this, x, y, w, h);

        this.hide();
        this.opacity = 255;
        this.openness = 255;
    };

    // ------------------------------------------------------------
    // Text rendering (centered)
    // ------------------------------------------------------------

    Window_PartyCommandTooltip.prototype.setText = function(lines) {
        this.contents.clear();

        if (!lines || !lines.length) {
            this.hide();
            return;
        }

        this.show();
        this.opacity = 255;
        this.openness = 255;

        var lh = this.lineHeight();
        var total = lines.length * lh;
        var startY = Math.floor((this.contentsHeight() - total) / 2);

        for (var i = 0; i < lines.length; i++) {
            this.drawText(
                lines[i],
                0,
                startY + i * lh,
                this.contentsWidth(),
                'center'
            );
        }
    };

    // ------------------------------------------------------------
    // Scene hookup
    // ------------------------------------------------------------

    var _Scene_Battle_createAllWindows =
        Scene_Battle.prototype.createAllWindows;

    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);

        this._partyCommandTooltipWindow =
            new Window_PartyCommandTooltip();

        this.addWindow(this._partyCommandTooltipWindow);
    };

    // ------------------------------------------------------------
    // Tooltip mapping
    // ------------------------------------------------------------

    function tooltipForCommand(name) {
        switch (name) {

        case "Fight":
            return ["Fight!"];

        case "Scan":
            return ["Shows enemy status. Instant cast."];

        case "Status":
            return ["Shows party status. Instant cast."];

        case "Auto-Battle":
            return [
                "Your party will use the skill/item last used this turn. Excludes Instant Cast.",
                "If they cannot, their turn will be skipped."
            ];

        case "Combat Log":
            return ["Shows the battle results from previous turns."];

        case "Teleports":
        case "Teleport":
            return ["Ends the battle and teleports you to the selected area."];
        }

        return null;
    }

    // ------------------------------------------------------------
    // Hook party command window
    // ------------------------------------------------------------

    var _Window_PartyCommand_update =
        Window_PartyCommand.prototype.update;

    Window_PartyCommand.prototype.update = function() {
        _Window_PartyCommand_update.call(this);

        var scene = SceneManager._scene;
        var tip = scene && scene._partyCommandTooltipWindow;

        if (!tip) return;

        if (!this.active) {
            tip.hide();
            return;
        }

        tip.setText(
            tooltipForCommand(this.commandName(this.index()))
        );
    };

    // ------------------------------------------------------------
    // Hide cleanup
    // ------------------------------------------------------------

    var _Scene_Battle_startActorCommandSelection =
        Scene_Battle.prototype.startActorCommandSelection;

    Scene_Battle.prototype.startActorCommandSelection = function() {

        var tip = this._partyCommandTooltipWindow;
        if (tip) tip.hide();

        _Scene_Battle_startActorCommandSelection.call(this);
    };

})();
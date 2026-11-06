//=============================================================================
// IBS_StatusMenuReplace.js
//=============================================================================

/*:
 * @plugindesc Replaces the Status Menu General tab with the
 * YEP_X_InBattleStatus style layout + selectable state list.
 * @author ChatGPT
 *
 * @help
 * Controls:
 * - OK = Enter state list
 * - Cancel = Exit state list
 * - Left/Right = Change actor while in state list
 *
 * Place BELOW:
 * - YEP_StatusMenuCore
 * - YEP_X_InBattleStatus
 */

(function() {

if (!Imported.YEP_X_InBattleStatus) {
    console.error("Requires YEP_X_InBattleStatus");
    return;
}

//=============================================================================
// Window_StatusInfo
//=============================================================================

Window_StatusInfo.prototype.drawGeneral = function() {
    var actor = this._actor;
    if (!actor) return;

    this.contents.clear();

    var listWidth = eval(Yanfly.Param.IBSStatusListWidth);
    var x = this.standardPadding() + listWidth;

    // Face
    this.drawActorFace(actor, x, 0, Window_Base._faceWidth);

    // Simple status
    var x2 = x + Window_Base._faceWidth + this.standardPadding();
    var w = this.contents.width - x2;

    this.drawActorSimpleStatus(actor, x2, 0, w);

    // Parameters
    w = this.contents.width - x;

    var y = Math.ceil(this.lineHeight() * 4.5);
    var h = this.contents.height - y;

    if (h >= this.lineHeight() * 6) {

        for (var i = 2; i < 8; ++i) {
            this.drawIBSParam(actor, i, x, y, w, this.lineHeight());
            y += this.lineHeight();
        }

    } else {

        w = Math.floor(w / 2);
        x2 = x;

        for (var i = 2; i < 8; ++i) {

            this.drawIBSParam(actor, i, x2, y, w, this.lineHeight());

            if (i % 2 === 0) {
                x2 += w;
            } else {
                x2 = x;
                y += this.lineHeight();
            }
        }
    }

    this.drawIBSStates(actor, 0, 0, listWidth);
};

Window_StatusInfo.prototype.drawIBSParam =
function(actor, paramId, dx, dy, dw, dh) {

    this.drawIBSDarkRect(dx, dy, dw, dh);

    var level = actor._buffs[paramId];
    var icon = actor.buffIconIndex(level, paramId);

    this.drawIcon(icon, dx + 2, dy + 2);

    dx += Window_Base._iconWidth + 4;
    dw -= Window_Base._iconWidth + 4 + this.textPadding() + 2;

    this.changeTextColor(this.systemColor());
    this.drawText(TextManager.param(paramId), dx, dy, dw);

    var value = actor.param(paramId);

    this.changeTextColor(this.paramchangeTextColor(level));
    this.drawText(Yanfly.Util.toGroup(value), dx, dy, dw, 'right');
};

Window_StatusInfo.prototype.drawIBSDarkRect =
function(dx, dy, dw, dh) {

    var color = this.gaugeBackColor();

    this.changePaintOpacity(false);
    this.contents.fillRect(dx + 1, dy + 1, dw - 2, dh - 2, color);
    this.changePaintOpacity(true);
};

Window_StatusInfo.prototype.drawIBSStates =
function(actor, x, y, width) {

    var lineHeight = this.lineHeight();
    var drawY = y;

    var states = actor.states();

    // States
    for (var i = 0; i < states.length; i++) {

        var state = states[i];

        if (!state) continue;
        if (state.iconIndex <= 0) continue;

        this.drawItemName(state, x, drawY, width);

        drawY += lineHeight;
    }

    // Buffs / Debuffs
    for (var i = 0; i < 8; i++) {

        if (!actor.isBuffAffected(i) &&
            !actor.isDebuffAffected(i)) {
            continue;
        }

        var level = actor._buffs[i];
        var icon = actor.buffIconIndex(level, i);

        this.drawIcon(icon, x + 2, drawY + 2);

        var text = level > 0
            ? Yanfly.Param.IBSBuffText[i]
            : Yanfly.Param.IBSDebuffText[i];

        this.resetTextColor();

        this.drawText(
            text,
            x + Window_Base._iconWidth + 8,
            drawY,
            width - Window_Base._iconWidth - 8
        );

        drawY += lineHeight;
    }

    // Healthy
    if (drawY === y) {

        this.drawIcon(
            Yanfly.Param.IBSHealthyIcon,
            x + 2,
            y + 2
        );

        this.drawText(
            Yanfly.Param.IBSHealthyText,
            x + Window_Base._iconWidth + 8,
            y,
            width - Window_Base._iconWidth - 8
        );
    }
};

//=============================================================================
// Window_StatusStateList
//=============================================================================

function Window_StatusStateList() {
    this.initialize.apply(this, arguments);
}

Window_StatusStateList.prototype =
    Object.create(Window_Selectable.prototype);

Window_StatusStateList.prototype.constructor =
    Window_StatusStateList;

Window_StatusStateList.prototype.initialize =
function(parentWindow) {

    this._parentWindow = parentWindow;
    this._actor = null;

    var width = eval(Yanfly.Param.IBSStatusListWidth);
    width += this.standardPadding() * 2;

    Window_Selectable.prototype.initialize.call(
        this,
        parentWindow.x,
        parentWindow.y,
        width,
        parentWindow.height
    );

    this.opacity = 0;
    this.backOpacity = 0;

    this._data = [];

    this.hide();
    this.deactivate();
};

Window_StatusStateList.prototype.setActor =
function(actor) {

    this._actor = actor;
    this.refresh();
    this.select(0);
};

Window_StatusStateList.prototype.maxItems = function() {
    return this._data ? this._data.length : 0;
};

Window_StatusStateList.prototype.makeItemList = function() {

    this._data = [];

    if (!this._actor) return;

    var states = this._actor.states();

    // States
    for (var i = 0; i < states.length; i++) {

        var state = states[i];

        if (!state) continue;
        if (state.iconIndex <= 0) continue;

        this._data.push(state);
    }

    // Buffs / Debuffs
    for (var i = 0; i < 8; i++) {

        if (this._actor.isBuffAffected(i) ||
            this._actor.isDebuffAffected(i)) {

            this._data.push("buff " + i);
        }
    }

    // Healthy
    if (this._data.length <= 0) {
        this._data.push(null);
    }
};

Window_StatusStateList.prototype.drawItem =
function(index) {

    var item = this._data[index];
    var rect = this.itemRect(index);

    if (item === null) {

        this.drawIcon(
            Yanfly.Param.IBSHealthyIcon,
            rect.x + 2,
            rect.y + 2
        );

        this.drawText(
            Yanfly.Param.IBSHealthyText,
            rect.x + 40,
            rect.y,
            rect.width - 40
        );

    } else if (typeof item === 'string') {

        var paramId = Number(item.match(/\d+/)[0]);
        var level = this._actor._buffs[paramId];

        var icon = this._actor.buffIconIndex(level, paramId);

        this.drawIcon(icon, rect.x + 2, rect.y + 2);

        var text = level > 0
            ? Yanfly.Param.IBSBuffText[paramId]
            : Yanfly.Param.IBSDebuffText[paramId];

        this.drawText(
            text,
            rect.x + 40,
            rect.y,
            rect.width - 40
        );

    } else {

        this.drawItemName(item, rect.x, rect.y, rect.width);

    }
};

Window_StatusStateList.prototype.updateHelp =
function() {

    if (!this._helpWindow) return;

    var item = this._data[this.index()];

    if (item === null) {

        this._helpWindow.setText(
            Yanfly.Param.IBSHealthyHelp
        );

    } else if (typeof item === 'string') {

        var paramId = Number(item.match(/\d+/)[0]);
        var level = this._actor._buffs[paramId];

        var fmt = level > 0
            ? Yanfly.Param.IBSBuffHelp[paramId]
            : Yanfly.Param.IBSDebuffHelp[paramId];

        var rate = Math.floor(
            this._actor.paramBuffRate(paramId) * 100
        );

        var turns = this._actor._buffTurns[paramId];

        this._helpWindow.setText(
            fmt.format(rate, Math.abs(level), turns)
        );

    } else {

        this.setHelpWindowItem(item);

    }
};

Window_StatusStateList.prototype.refresh =
function() {

    this.makeItemList();
    this.createContents();
    this.drawAllItems();
};

Window_StatusStateList.prototype.update =
function() {

    Window_Selectable.prototype.update.call(this);

    if (!this.active) return;
    if (!this._actor) return;

    var members = $gameParty.members();

    var index = members.indexOf(this._actor);
    var oldIndex = index;

    if (Input.isRepeated('right')) {
        index++;
    } else if (Input.isRepeated('left')) {
        index--;
    }

    index = index.clamp(0, members.length - 1);

    if (index !== oldIndex) {

        this.setActor(members[index]);

        var scene = SceneManager._scene;

        if (scene._statusWindow) {
            scene._statusWindow.setActor(members[index]);
        }

        if (scene._statusInfoWindow) {
            scene._statusInfoWindow.setActor(members[index]);
            scene._statusInfoWindow.refresh();
        }

        if (scene._infoWindow) {
            scene._infoWindow.setActor(members[index]);
            scene._infoWindow.refresh();
        }

        SoundManager.playCursor();
    }
};

//=============================================================================
// Scene_Status
//=============================================================================

var IBS_Scene_Status_create =
    Scene_Status.prototype.create;

Scene_Status.prototype.create = function() {

    IBS_Scene_Status_create.call(this);

    this.createIBSStateList();
};

Scene_Status.prototype.createIBSStateList =
function() {

    var parent =
        this._statusInfoWindow ||
        this._infoWindow ||
        this._statusWindow;

    if (!parent) {
        console.warn("IBS Status List: No valid parent window found.");
        return;
    }

    this._ibsStateList =
        new Window_StatusStateList(parent);

    this._ibsStateList.setHelpWindow(this._helpWindow);

    this.addWindow(this._ibsStateList);

    this._ibsStateList.setHandler(
        'cancel',
        this.onIBSStateCancel.bind(this)
    );
};

var IBS_Scene_Status_onInfoOk =
    Scene_Status.prototype.onInfoOk;

Scene_Status.prototype.onInfoOk = function() {

    if (this._commandWindow &&
        this._commandWindow.currentSymbol &&
        this._commandWindow.currentSymbol() === 'general') {

        if (!this._ibsStateList) return;

        this._ibsStateList.show();
        this._ibsStateList.activate();
        this._ibsStateList.setActor(this.actor());

        if (this._helpWindow) {
            this._helpWindow.show();
        }

        return;
    }

    IBS_Scene_Status_onInfoOk.call(this);
};

Scene_Status.prototype.onIBSStateCancel =
function() {

    if (!this._ibsStateList) return;

    this._ibsStateList.hide();
    this._ibsStateList.deactivate();

    if (this._helpWindow) {
        this._helpWindow.hide();
    }

    if (this._statusInfoWindow) {
        this._statusInfoWindow.activate();
    } else if (this._infoWindow) {
        this._infoWindow.activate();
    }
};

})();
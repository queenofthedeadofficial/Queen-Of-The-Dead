/*:
 * @plugindesc Learnset tab for Status Menu with OK showing skill details. Hides for actors 1,2,3. Requires YEP_StatusMenuCore. 
 * @author VA
 */

(function() {

const EXCLUDED_ACTOR_IDS = [1, 2, 3];
// Game Variable holding the EXP requirement for a given learnset level is
// (LEARNSET_EXP_VARIABLE_BASE + level), e.g. level 2 -> variable 4952.
const LEARNSET_EXP_VARIABLE_BASE = 4950;
const LEARNSET_DETAIL_HEIGHT = 120;

// ---------------- parse learnset ----------------
function parseLearnset(actor) {
    if (!actor) return [];
    const cls = actor.currentClass();
    if (!cls || !cls.note) return [];
    const notes = cls.note.split(/[\r\n]+/);
    const learnset = [];

    notes.forEach(line => {
        const twoMatch = line.match(/<Level Up Learn Skill:\s*(\d+)\s*,\s*(\d+)\s*>/i);
        const oneMatch = line.match(/<Level Up Learn Skill:\s*(\d+)\s*>/i);
        if (twoMatch) {
            const level = Number(twoMatch[1]);
            const skillId = Number(twoMatch[2]);
            learnset.push({ level: level, skillId: skillId });
        } else if (oneMatch) {
            const skillId = Number(oneMatch[1]);
            learnset.push({ level: 1, skillId: skillId });
        }
    });

    learnset.sort((a, b) => a.level - b.level);
    return learnset;
}

// ---------------- Status command ----------------
// Everything in this block only makes sense if YEP_StatusMenuCore is loaded
// (it defines Window_StatusCommand / Scene_Status). Guarding it means a
// missing/misordered YEP_StatusMenuCore can't throw here and abort the rest
// of this script - which would otherwise prevent Window_Learnset and
// Window_LearnsetDetail (defined below, used by other plugins) from ever
// being exported.
if (typeof Window_StatusCommand === "undefined" ||
    typeof Scene_Status === "undefined") {

    console.warn(
        "Level_Up_Learnset.js: YEP_StatusMenuCore not found (or loaded " +
        "after this plugin). Skipping the Status Menu 'Learnset' tab, but " +
        "Window_Learnset/Window_LearnsetDetail will still be defined and " +
        "exported for other plugins to use."
    );

} else {

const _WSC_addCustomCommands = Window_StatusCommand.prototype.addCustomCommands;
Window_StatusCommand.prototype.addCustomCommands = function() {
    _WSC_addCustomCommands.call(this);
    const actor = this._actor || $gameParty.menuActor();
    if (actor && !EXCLUDED_ACTOR_IDS.includes(actor.actorId())) {
        this.addCommand("Learnset", "learnset");
    }
};

const _WSC_setActor = Window_StatusCommand.prototype.setActor;
Window_StatusCommand.prototype.setActor = function(actor) {
    _WSC_setActor.call(this, actor);
    this.refresh();
};

// ---------------- Scene_Status create windows ----------------
// YEP_StatusMenuCore's Scene_Status.create() builds, in order:
//   _commandWindow  (tab list)
//   _statusWindow   (portrait/basic info box, top right, always visible —
//                    this is the box the skill description now takes over)
//   _infoWindow     (Window_StatusInfo - the big box that swaps its
//                    drawn content per-tab: General/Parameters/Elements/etc)
// The "general tab stats box" is _infoWindow. We size our learnset window
// to match it exactly and swap visibility with it, instead of creating a
// new box below _statusWindow.
const _SceneStatus_create = Scene_Status.prototype.create;
Scene_Status.prototype.create = function() {
    _SceneStatus_create.call(this);
    this.createLearnsetWindow();
    this.createLearnsetDetailWindow();
};

Scene_Status.prototype.createLearnsetWindow = function() {
    const wx = this._infoWindow.x;
    const wy = this._infoWindow.y;
    const ww = this._infoWindow.width;
    const wh = this._infoWindow.height - LEARNSET_DETAIL_HEIGHT;

    this._learnsetWindow = new Window_Learnset(wx, wy, ww, wh);
    this._learnsetWindow.setHandler('ok', this.onLearnsetOk.bind(this));
    this._learnsetWindow.setHandler('cancel', this.onLearnsetCancel.bind(this));
    // Fires every time the cursor moves onto a different skill.
    this._learnsetWindow._onIndexChange = this.onLearnsetIndexChange.bind(this);
    this._learnsetWindow.setActor(this.actor());
    this.addWindow(this._learnsetWindow);
};

Scene_Status.prototype.createLearnsetDetailWindow = function() {
    // Bottom strip within the same box, showing learned/EXP-required status.
    const wx = this._infoWindow.x;
    const wy = this._infoWindow.y + this._infoWindow.height - LEARNSET_DETAIL_HEIGHT;
    const ww = this._infoWindow.width;
    const wh = LEARNSET_DETAIL_HEIGHT;
    this._learnsetDetailWindow = new Window_LearnsetDetail(wx, wy, ww, wh);
    this._learnsetDetailWindow.hide();
    this.addWindow(this._learnsetDetailWindow);
};

// ---------------- command window wiring ----------------
const _SceneStatus_createCommandWindow = Scene_Status.prototype.createCommandWindow;
Scene_Status.prototype.createCommandWindow = function() {
    _SceneStatus_createCommandWindow.call(this);
    this._commandWindow.setHandler('learnset', this.commandLearnset.bind(this));
};

Scene_Status.prototype.commandLearnset = function() {
    this._infoWindow.hide();

    this._learnsetWindow.show();
    this._learnsetDetailWindow.show();

    this._learnsetWindow.select(0);
    this._learnsetWindow.activate();
};

// ---------------- handlers ----------------
Scene_Status.prototype.onLearnsetIndexChange = function(item) {
    const skill = item ? $dataSkills[item.skillId] : null;

    this.drawLearnsetSkillInHelpWindow(skill);

    if (this._learnsetDetailWindow) {
        this._learnsetDetailWindow.setLearnsetItem(
            this.actor(),
            item
        );
    }
};
// Overwrites the help window (the box above the command list/status box —
// normally shows the actor's profile text) with the icon, name, and
// description of the currently highlighted skill.
Scene_Status.prototype.drawLearnsetSkillInHelpWindow = function(skill) {
    const win = this._helpWindow;
    if (!win) return;
    if (!skill) {
        win.setText("");
        return;
    }
    win.setText(skill.description || "");
};

// OK no longer opens anything (the description is already live via cursor
// movement); this just keeps the list active instead of freezing, since
// Window_Selectable.processOk() deactivates the window before calling the
// handler regardless of whether one is registered.
Scene_Status.prototype.onLearnsetOk = function() {
    this._learnsetWindow.activate();
};

Scene_Status.prototype.onLearnsetCancel = function() {
    SoundManager.playCancel();

    this._learnsetWindow.deselect();
    this._learnsetWindow.deactivate();
    this._learnsetWindow.hide();

    this._learnsetDetailWindow.hide();

    this._infoWindow.show();

    if (this._helpWindow) {
        this._helpWindow.setText(this.actor().profile());
    }

    this._commandWindow.activate();
};

// refreshActor() is what YEP_StatusMenuCore actually calls on scene create
// and on actor page-up/page-down (there is no Scene_Status.setActor in the
// core). Hook it here so the learnset window stays synced to the currently
// displayed actor.
const _SceneStatus_refreshActor = Scene_Status.prototype.refreshActor;
Scene_Status.prototype.refreshActor = function() {
    _SceneStatus_refreshActor.call(this);
    const actor = this.actor();
    if (this._learnsetWindow) this._learnsetWindow.setActor(actor);
};

} // end YEP_StatusMenuCore guard

// ---------------- Window_Learnset ----------------
// (Defined unconditionally - used by the Status Menu tab above when
// YEP_StatusMenuCore is present, and reusable by other plugins either way.)
function Window_Learnset() {
    this.initialize.apply(this, arguments);
}

Window_Learnset.prototype = Object.create(Window_Selectable.prototype);
Window_Learnset.prototype.constructor = Window_Learnset;

Window_Learnset.prototype.initialize = function(x, y, w, h) {
    this._actor = null;
    this._data = [];
    this._onIndexChange = null;
    Window_Selectable.prototype.initialize.call(this, x, y, w, h);
    this.hide();
};

Window_Learnset.prototype.setActor = function(actor) {
    this._actor = actor;
    this._data = parseLearnset(actor) || [];
    this.refresh();
};

Window_Learnset.prototype.select = function(index) {
    Window_Selectable.prototype.select.call(this, index);
    if (this._onIndexChange) this._onIndexChange(this.itemAt(index));
};

Window_Learnset.prototype.itemAt = function(index) {
    return this._data && index >= 0 && index < this._data.length ? this._data[index] : null;
};

Window_Learnset.prototype.maxItems = function() {
    return this._data ? this._data.length : 0;
};

Window_Learnset.prototype.drawItem = function(index) {
    const item = this._data[index];
    if (!item) return;
    const rect = this.itemRect(index);
    const skill = $dataSkills[item.skillId];
    if (!skill) return;

    this.changeTextColor(this.textColor(0));
    if (this._actor && this._actor.isLearnedSkill(item.skillId)) {
        this.changePaintOpacity(false);
    }

    this.drawText("Lv " + item.level, rect.x, rect.y, 60);
    // draw icon if available
    if (skill.iconIndex) {
        this.drawIcon(skill.iconIndex, rect.x + 64, rect.y + 2);
        this.drawText(skill.name, rect.x + 96, rect.y, rect.width - 96);
    } else {
        this.drawText(skill.name, rect.x + 70, rect.y, rect.width - 70);
    }

    this.changePaintOpacity(true);
};

// ---------------- Window_LearnsetDetail ----------------
function Window_LearnsetDetail() {
    this.initialize.apply(this, arguments);
}

Window_LearnsetDetail.prototype = Object.create(Window_Base.prototype);
Window_LearnsetDetail.prototype.constructor = Window_LearnsetDetail;

Window_LearnsetDetail.prototype.initialize = function(x, y, w, h) {
    Window_Base.prototype.initialize.call(this, x, y, w, h);
    this._skill = null;
    this.hide();
};

Window_LearnsetDetail.prototype.setLearnsetItem = function(actor, item) {
    this._actor = actor;
    this._item = item;
    this._lastExp = actor ? actor.currentExp() : 0;
    this.refresh();
};

Window_LearnsetDetail.prototype.refresh = function() {
    this.contents.clear();

    if (!this._actor || !this._item) return;

    this.resetTextColor();

    if (this._actor.isLearnedSkill(this._item.skillId)) {
        this.drawText(
            "Already learned!",
            4,
            4,
            this.contents.width - 8
        );
        return;
    }

    const requiredExpVariableId =
        LEARNSET_EXP_VARIABLE_BASE + this._item.level;

    const requiredExp = $gameVariables.value(requiredExpVariableId);
    const currentExp = this._actor.currentExp();

    const remainingExp = Math.max(0, requiredExp - currentExp);

    this.drawText(
        "Experience Required: " + remainingExp,
        4,
        4,
        this.contents.width - 8
    );
};

// ---------------- Export ----------------
// Exposed so other plugins (e.g. Blank_Status_Scene.js) can reuse these
// window classes to display learnset data outside the Status Menu.
window.Window_Learnset = Window_Learnset;
window.Window_LearnsetDetail = Window_LearnsetDetail;

})();
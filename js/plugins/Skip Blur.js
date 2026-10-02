//=============================================================================
// Andrew_CBE_SkipBlurOnBattleEquip.js
// Skips the background blur specifically for the battle-equip snapshot
//=============================================================================

var Andrew_CBE = Andrew_CBE || {};

Andrew_CBE.SceneManager_snapForBackground = SceneManager.snapForBackground;
SceneManager.snapForBackground = function() {
    this._backgroundBitmap = this.snap();
    if (!$gameTemp._cbeBattle) {
        this._backgroundBitmap.blur();
    }
};
//=============================================================================
// Andrew_CBE_PreloadActorImages.js
// Preloads face/character images at battle start so Change Battle Equip
// never has to load them cold mid-transition.
//=============================================================================

Andrew_CBE = Andrew_CBE || {};

Andrew_CBE.BattleManager_startBattle = BattleManager.startBattle;
BattleManager.startBattle = function() {
    Andrew_CBE.BattleManager_startBattle.call(this);
    $gameParty.loadActorImages();
};
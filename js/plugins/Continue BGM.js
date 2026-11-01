//=============================================================================
// Andrew_KeepMapBgm.js
//=============================================================================

/*:
 * @plugindesc v1.00 Keeps the map BGM playing during battle unless an enemy
 * in the troop has the <Boss> notetag.
 * @author Andrew
 *
 * @param Boss Tag
 * @text Boss Tag
 * @type string
 * @desc Notetag name (without the angle brackets) that marks a boss enemy.
 * @default Boss
 *
 * @param Keep BGS
 * @text Keep BGS
 * @type boolean
 * @on Keep
 * @off Stop
 * @desc Keep the map's BGS playing too on non-boss battles?
 * (Vanilla MV stops BGS when a battle starts.)
 * @default false
 *
 * @help
 * ============================================================================
 * Andrew_KeepMapBgm v1.00
 * ============================================================================
 * When a battle starts, the map's BGM keeps playing instead of switching to
 * the battle BGM, UNLESS at least one enemy in the troop has this notetag
 * in its database entry:
 *
 *   <Boss>
 *
 * If any enemy in the troop has it, the normal battle BGM plays as usual
 * (including whatever "Change Battle BGM" has set).
 *
 * Notes:
 * - Only the enemies' own notetags are checked (Enemies tab of the database).
 * - Hidden / late-appearing enemies in the troop still count.
 * - After the battle, the map BGM carries on from where it is (the victory
 *   ME pauses and resumes it as normal MV behavior).
 * - If the map has no BGM playing, a non-boss battle is silent.
 * - Does nothing during editor battle tests.
 *
 * Load order: place below the YEP plugins.
 *
 * Script call (optional, for events):
 *   Andrew.KeepMapBgm.shouldKeep()  -> true if the current troop is non-boss
 */

var Andrew = Andrew || {};
Andrew.KeepMapBgm = Andrew.KeepMapBgm || {};

(function() {
    'use strict';

    // Self-detect filename so PluginManager.parameters() always matches.
    var src = (document.currentScript && document.currentScript.src) || '';
    var pluginName = decodeURIComponent(src.split('/').pop()).replace(/\.js$/i, '');
    var params = PluginManager.parameters(pluginName);

    var bossTag = String(params['Boss Tag'] || 'Boss').trim();
    var keepBgs = String(params['Keep BGS']).toLowerCase() === 'true';

    var escaped = bossTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var bossRegex = new RegExp('<' + escaped + '>', 'i');

    //-------------------------------------------------------------------------
    // Core check
    //-------------------------------------------------------------------------

    Andrew.KeepMapBgm.troopHasBoss = function() {
        if (!$gameTroop) return false;
        return $gameTroop.members().some(function(enemy) {
            var data = enemy && enemy.enemy();
            return !!data && bossRegex.test(data.note || '');
        });
    };

    Andrew.KeepMapBgm.shouldKeep = function() {
        if (DataManager.isBattleTest()) return false;
        return !Andrew.KeepMapBgm.troopHasBoss();
    };

    //-------------------------------------------------------------------------
    // Scene_Map: don't stop the BGM when the battle starts
    //-------------------------------------------------------------------------

    var _Scene_Map_stopAudioOnBattleStart = Scene_Map.prototype.stopAudioOnBattleStart;
    Scene_Map.prototype.stopAudioOnBattleStart = function() {
        if (Andrew.KeepMapBgm.shouldKeep()) {
            if (!keepBgs) AudioManager.stopBgs();
            AudioManager.stopMe();
            AudioManager.stopSe();
            return;
        }
        _Scene_Map_stopAudioOnBattleStart.call(this);
    };

    //-------------------------------------------------------------------------
    // BattleManager: don't start the battle BGM
    //-------------------------------------------------------------------------

    var _BattleManager_playBattleBgm = BattleManager.playBattleBgm;
    BattleManager.playBattleBgm = function() {
        if (Andrew.KeepMapBgm.shouldKeep()) {
            if (!keepBgs) AudioManager.stopBgs();
            return;
        }
        _BattleManager_playBattleBgm.call(this);
    };

})();
/*:
 * @plugindesc Persists runtime changes to enemy parameters through save/load.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Persistent Enemy Parameters
 * ============================================================================
 *
 * This plugin preserves runtime modifications made to:
 *
 *     $dataEnemies[id].params[index]
 *
 * through the game's save system.
 *
 * Example:
 *
 *     $dataEnemies[6].params[2] += 1;
 *
 * Enemy 6's ATK will be saved and restored when the save file is loaded.
 *
 * Parameter indexes:
 *
 *     0 = Max HP
 *     1 = Max MP
 *     2 = ATK
 *     3 = DEF
 *     4 = MAT
 *     5 = MDF
 *     6 = AGI
 *     7 = LUK
 *
 * The plugin does NOT modify your existing parameter-changing scripts.
 *
 * Runtime changes are saved when the game is saved and restored when that
 * save file is loaded.
 *
 * Starting a completely new game uses the normal database values.
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //=========================================================================
    // DataManager.makeSaveContents
    // Save the current enemy parameters.
    //=========================================================================

    var _DataManager_makeSaveContents = DataManager.makeSaveContents;

    DataManager.makeSaveContents = function() {

        var contents = _DataManager_makeSaveContents.call(this);

        contents.persistentEnemyParams = [];

        for (var i = 1; i < $dataEnemies.length; i++) {

            var enemy = $dataEnemies[i];

            if (!enemy) {
                continue;
            }

            // Store a copy of the parameter array.
            contents.persistentEnemyParams[i] = enemy.params.slice();
        }

        return contents;
    };


    //=========================================================================
    // DataManager.extractSaveContents
    // Restore the enemy parameters from the save file.
    //=========================================================================

    var _DataManager_extractSaveContents = DataManager.extractSaveContents;

    DataManager.extractSaveContents = function(contents) {

        _DataManager_extractSaveContents.call(this, contents);

        if (!contents.persistentEnemyParams) {
            return;
        }

        for (var i = 1; i < contents.persistentEnemyParams.length; i++) {

            var savedParams = contents.persistentEnemyParams[i];

            if (!savedParams) {
                continue;
            }

            if (!$dataEnemies[i]) {
                continue;
            }

            // Restore the saved values.
            $dataEnemies[i].params = savedParams.slice();
        }
    };

})();
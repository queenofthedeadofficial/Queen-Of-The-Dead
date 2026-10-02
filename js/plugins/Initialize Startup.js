/*:
 * @plugindesc First-run-only default options initializer (one-time execution)
 * @author You
 */

(() => {

  const FIRST_RUN_KEY = 'MV_FIRST_RUN_OPTIONS_SET';

  const _ConfigManager_load = ConfigManager.load;
  ConfigManager.load = function() {
    _ConfigManager_load.call(this);

    // Use localStorage so this survives new games
    const firstRunDone = localStorage.getItem(FIRST_RUN_KEY);

    if (!firstRunDone) {
      this._bgmVolume = 60;
      this._alwaysDash = true;

      // YEP_CoreEngine adds this option
      if (this.hasOwnProperty('_animateTiles')) {
        this._animateTiles = true;
      }

      this.save();
      localStorage.setItem(FIRST_RUN_KEY, 'true');
    }
  };

})();

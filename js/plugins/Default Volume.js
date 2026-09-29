(function() {
    var defaults = { bgmVolume: 40, bgsVolume: 100, meVolume: 100, seVolume: 40 };

    var _readVolume = ConfigManager.readVolume;
    ConfigManager.readVolume = function(config, name) {
        if (config[name] === undefined && defaults[name] !== undefined) {
            return defaults[name];
        }
        return _readVolume.call(this, config, name);
    };
})();
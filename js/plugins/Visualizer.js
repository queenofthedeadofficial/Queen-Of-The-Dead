/*:
 * @plugindesc Simple audio visualizer behind enemies (concept)
 */
(function() {
  const _createSpritesetBattle = Spriteset_Battle.prototype.createLowerLayer;
  Spriteset_Battle.prototype.createLowerLayer = function() {
    _createSpritesetBattle.call(this);
    // create container for visualizer and insert before enemy sprites
    this._visualizerContainer = new PIXI.Container();
    this._visualizerContainer.z = 0;
    this.addChildAt(this._visualizerContainer, 0);
    this._createVisualizer();
  };

  Spriteset_Battle.prototype._createVisualizer = function() {
    // PIXI graphics that will draw bars
    this._vizGraphics = new PIXI.Graphics();
    this._visualizerContainer.addChild(this._vizGraphics);

    // WebAudio analyser setup (simple)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this._audioCtx = new AudioContext();
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 256;
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);

      // connect MV's master gain node if accessible, otherwise create a source
      // NOTE: hooking into MV's internal audio may require extra work.
    } catch (e) {
      console.warn('Visualizer: WebAudio not available', e);
    }
  };

  const _update = Spriteset_Battle.prototype.update;
  Spriteset_Battle.prototype.update = function() {
    _update.call(this);
    if (this._analyser) this._updateVisualizer();
  };

  Spriteset_Battle.prototype._updateVisualizer = function() {
    this._analyser.getByteFrequencyData(this._dataArray);
    const g = this._vizGraphics;
    g.clear();
    const w = Graphics.width;
    const barCount = 32;
    const barW = Math.floor(w / barCount);
    for (let i = 0; i < barCount; i++) {
      const v = this._dataArray[i] / 255;
      const h = v * 120;
      g.beginFill(0x66ccff, 0.6);
      g.drawRect(i * barW, Graphics.height - h - 160, barW - 2, h);
      g.endFill();
    }
  };
})();

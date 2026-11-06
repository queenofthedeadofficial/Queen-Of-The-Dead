//=============================================================================
// Andrew_TextBoxPictures.js
//=============================================================================

/*:
 * @plugindesc v1.06 Draws pictures from img/pictures inline in message boxes using {PictureName} or [PictureName] tags.
 * @author Andrew
 *
 * @param Extension
 * @desc File extension(s) to look for, without the dot. Separate several with commas; they are tried in order (e.g. jpg,png,gif).
 * @default jpg
 *
 * @param Fallback Extension
 * @desc Extra extension(s) tried after the ones above (comma-separated). Leave blank for none.
 * @default png
 *
 * @param Max Height
 * @type number
 * @min 0
 * @desc Maximum picture height in pixels. 0 = fit the text line height.
 * @default 0
 *
 * @param Vertical Padding
 * @type number
 * @min 0
 * @desc Pixels kept free above and below the picture inside its line.
 * @default 2
 *
 * @param Spacing
 * @type number
 * @min 0
 * @desc Extra pixels added to the right of each picture.
 * @default 2
 *
 * @param Allow Upscale
 * @type boolean
 * @on Yes
 * @off No
 * @desc Enlarge pictures that are smaller than the line height? (No = never enlarge)
 * @default false
 *
 * @param Picture List
 * @desc Optional. Comma-separated picture names (no extension). If filled in, ONLY these names become pictures and the folder check is skipped.
 * @default
 *
 * @help
 * ============================================================================
 * Andrew_TextBoxPictures v1.06
 * ============================================================================
 * Put a picture name in curly braces {Name} (or square brackets [Name])
 * inside any Show Text message and the matching image from img/pictures is
 * drawn in its place, inline with the text.
 *
 *   Press {Enter} to continue.
 *   Hold {Shift} to dash, then {Enter} to confirm.
 *
 * With the default settings, {Enter} draws img/pictures/Enter.jpg. If no
 * Enter.jpg exists, Enter.png is tried (see Fallback Extension).
 *
 * Every tag works the same way: {A} draws img/pictures/A.png when that is the
 * file that exists, {Enter} draws Enter.jpg, and so on. The extensions are
 * tried in order, so mixing .jpg and .png files is fine. If the same name
 * exists with more than one extension, the first one in the list wins.
 *
 * Rules
 * - The name inside the braces/brackets must match the file name, without
 *   extension.
 * - A tagged word with no matching file is left alone and shows as normal
 *   text, so ordinary "[brackets]" or "{braces}" in your dialogue are safe. (The file check
 *   only works in the desktop/NW.js build. For browser or mobile deployment,
 *   fill in the Picture List parameter so only those names are converted.)
 * - Pictures are scaled down to fit the height of the text line, keeping their
 *   aspect ratio. Use Max Height to make them smaller than the line.
 * - Escape codes such as \C[2], \I[5], \V[1] are not affected.
 *
 * Notes
 * - Applies to the message window (Show Text) only.
 * - Pictures are loaded when a message starts; the message waits a moment if a
 *   picture is not loaded yet.
 * - With word-wrap plugins, a picture that has never been shown before is
 *   measured as a square the height of the line the first time. Showing it
 *   once (or listing it in the Picture List) makes later measurements exact.
 * - Load this plugin BELOW YEP_MessageCore and the other YEP plugins.
 *
 * Changelog
 * v1.00 - Initial release.
 * v1.01 - Added console diagnostics (see below) and a line-height fallback.
 * v1.02 - Debug mode also logs the raw message text at each stage.
 * v1.03 - Added {PictureName} curly-brace tags (square brackets still work).
 * v1.04 - Debug mode also logs who added each message line (stack trace).
 * v1.05 - Extension parameters accept comma-separated lists (tried in order).
 * v1.06 - Added window.andrewPictureWidth(name, lineHeight) so other plugins
 *         (e.g. Global Text Centering) can measure a picture's width.
 *
 * Troubleshooting
 * Press F8 in a playtest to open the console, then run:
 *   Andrew.TextPic.debug = true;
 *   Andrew.TextPic.info('Enter');
 * and show a message containing [Enter]. The console reports where the plugin
 * is looking for the file, whether it was found, and the picture's load state.
 */

var Andrew = Andrew || {};
Andrew.TextPic = Andrew.TextPic || {};
Andrew.TextPic.version = '1.06';

(function() {
    'use strict';

    //-------------------------------------------------------------------------
    // Parameters (filename is self-detected so renaming the file is safe)
    //-------------------------------------------------------------------------
    var src = (document.currentScript && document.currentScript.src) || '';
    var nameMatch = decodeURIComponent(src).match(/([^\/\\]+)\.js(?:\?.*)?$/i);
    var pluginName = nameMatch ? nameMatch[1] : 'Andrew_TextBoxPictures';
    var params = PluginManager.parameters(pluginName);

    function num(key, def) {
        var v = params[key];
        if (v === undefined || v === '') return def;
        v = Number(v);
        return isNaN(v) ? def : v;
    }
    function str(key, def) {
        var v = params[key];
        return (v === undefined) ? def : String(v).trim();
    }

    var cfg = {
        ext:         str('Extension', 'jpg').replace(/^\./, ''),
        fallbackExt: str('Fallback Extension', 'png').replace(/^\./, ''),
        maxHeight:   num('Max Height', 0),
        padY:        num('Vertical Padding', 2),
        spacing:     num('Spacing', 2),
        upscale:     String(params['Allow Upscale']).toLowerCase() === 'true',
        list:        str('Picture List', '').split(',')
                         .map(function(s) { return s.trim(); })
                         .filter(function(s) { return s.length > 0; })
    };
    // Ordered list of extensions to try for every picture name
    cfg.exts = [];
    (cfg.ext + ',' + cfg.fallbackExt).split(',').forEach(function(e) {
        e = e.trim().replace(/^\./, '');
        if (e && cfg.exts.indexOf(e) < 0) cfg.exts.push(e);
    });
    if (cfg.exts.length === 0) cfg.exts.push('jpg');
    cfg.ext = cfg.exts[0];

    //-------------------------------------------------------------------------
    // File lookup (NW.js only; elsewhere every tag is assumed valid unless a
    // Picture List is given)
    //-------------------------------------------------------------------------
    Andrew.TextPic.debug = false;
    Andrew.TextPic.log = function() {
        if (!Andrew.TextPic.debug) return;
        console.log.apply(console,
            ['[Andrew_TextBoxPictures]'].concat(Array.prototype.slice.call(arguments)));
    };

    var fs = null, pathMod = null, picDir = '';
    if (Utils.isNwjs()) {
        try {
            fs = require('fs');
            pathMod = require('path');
            picDir = pathMod.join(pathMod.dirname(process.mainModule.filename), 'img', 'pictures');
        } catch (e) {
            fs = null;
        }
    }

    function fileExists(name, ext) {
        if (fs.existsSync(pathMod.join(picDir, name + '.' + ext))) return true;
        // Encrypted deployments store .png as .rpgmvp
        if (ext.toLowerCase() === 'png') {
            return fs.existsSync(pathMod.join(picDir, name + '.rpgmvp'));
        }
        return false;
    }

    var resolved = {};   // name -> extension to use, or '' if not a picture

    // Returns the extension to load for this name, or '' if it isn't a picture.
    Andrew.TextPic.resolveExt = function(name) {
        if (Object.prototype.hasOwnProperty.call(resolved, name)) return resolved[name];
        var result = '';
        if (cfg.list.length > 0) {
            result = (cfg.list.indexOf(name) >= 0) ? cfg.ext : '';
        } else if (fs) {
            var tries = cfg.exts;
            for (var i = 0; i < tries.length; i++) {
                var found = fileExists(name, tries[i]);
                Andrew.TextPic.log('checked', pathMod.join(picDir, name + '.' + tries[i]),
                                   found ? 'FOUND' : 'missing');
                if (found) { result = tries[i]; break; }
            }
        } else {
            result = cfg.ext;
        }
        resolved[name] = result;
        Andrew.TextPic.log('resolve "' + name + '" ->', result ? '.' + result : '(not a picture)');
        return result;
    };

    // Console helper: Andrew.TextPic.info('Enter')
    Andrew.TextPic.info = function(name) {
        console.log('[Andrew_TextBoxPictures] v' + Andrew.TextPic.version + ' loaded as ' + pluginName + '.js');
        console.log('  extensions (tried in order): ' + cfg.exts.join(', '));
        console.log('  NW.js: ' + Utils.isNwjs() + ', file check: ' + (fs ? 'on' : 'off'));
        console.log('  pictures folder: ' + (picDir || '(n/a)'));
        if (cfg.list.length > 0) console.log('  picture list: ' + cfg.list.join(', '));
        if (name) {
            delete resolved[name];
            var ext = Andrew.TextPic.resolveExt(name);
            console.log('  "' + name + '" -> ' + (ext ? 'found as .' + ext : 'NOT FOUND'));
        }
    };

    Andrew.TextPic.loadBitmap = function(name, ext) {
        return ImageManager.loadNormalBitmap(
            'img/pictures/' + encodeURIComponent(name) + '.' + ext, 0);
    };

    //-------------------------------------------------------------------------
    // Converts [Name] into an internal escape code the message window can draw.
    // Safe to run more than once on the same text.
    //-------------------------------------------------------------------------
    var TAG_REGEX = /(\x1b[A-Za-z]+)?\[([^\[\]\r\n\x1b]+)\]|\{([^{}\r\n\x1b]+)\}/g;

    Andrew.TextPic.convertTags = function(text, win) {
        if (typeof text !== 'string' || (text.indexOf('[') < 0 && text.indexOf('{') < 0)) return text;
        return text.replace(TAG_REGEX, function(whole, code, squareName, curlyName) {
            // Part of an escape code such as \C[2] (or an already converted tag)
            if (code) return whole;
            var name = (squareName !== undefined) ? squareName : curlyName;
            var ext = Andrew.TextPic.resolveExt(name);
            if (!ext) {
                Andrew.TextPic.log('[' + name + '] is not a picture, left as text');
                return whole;
            }
            Andrew.TextPic.log('[' + name + '] converted to a picture tag (.' + ext + ')');
            var bitmap = Andrew.TextPic.loadBitmap(name, ext);
            if (win) {
                win._andrewPicPending = win._andrewPicPending || [];
                win._andrewPicPending.push(bitmap);
            }
            return '\x1bANDREWPIC[' + name + ']';
        });
    };

    //-------------------------------------------------------------------------
    // Window_Base: convert tags (message windows only) and draw them
    //-------------------------------------------------------------------------
    var _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        var isMsg = this instanceof Window_Message;
        if (isMsg) Andrew.TextPic.log('convert input:', JSON.stringify(text));
        text = _Window_Base_convertEscapeCharacters.call(this, text);
        if (isMsg) Andrew.TextPic.log('after core convert:', JSON.stringify(text));
        if (isMsg) {
            text = Andrew.TextPic.convertTags(text, this);
        }
        return text;
    };

    var _Window_Base_processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;
    Window_Base.prototype.processEscapeCharacter = function(code, textState) {
        if (code === 'ANDREWPIC') {
            this.andrewProcessPicture(textState);
        } else {
            _Window_Base_processEscapeCharacter.call(this, code, textState);
        }
    };

    // Works out how a {Name} picture is laid out on a line of the given
    // height. Used for both drawing and measuring so they always agree.
    // mode: 'image' (drawn), 'text' (missing file, shows the tag as text),
    //       'loading' (not ready yet, reserves a square).
    Window_Base.prototype.andrewPictureLayout = function(name, lineHeight) {
        var ext = Andrew.TextPic.resolveExt(name);
        var bitmap = ext ? Andrew.TextPic.loadBitmap(name, ext) : null;

        var availH = Math.max(1, lineHeight - cfg.padY * 2);
        if (cfg.maxHeight > 0) availH = Math.min(availH, cfg.maxHeight);

        var layout = { name: name, ext: ext, bitmap: bitmap, mode: 'loading',
                       w: availH, h: availH, label: '' };
        if (bitmap && bitmap.isReady() && bitmap.width > 0 && bitmap.height > 0) {
            var scale = availH / bitmap.height;
            if (!cfg.upscale) scale = Math.min(scale, 1);
            layout.mode = 'image';
            layout.w = Math.max(1, Math.round(bitmap.width * scale));
            layout.h = Math.max(1, Math.round(bitmap.height * scale));
        } else if (!bitmap || (bitmap.isError && bitmap.isError())) {
            layout.mode = 'text';
            layout.label = '[' + name + ']';
            layout.w = this.textWidth(layout.label);
        }
        layout.advance = layout.w + cfg.spacing;
        return layout;
    };

    // Total horizontal space a {Name} picture takes up (picture + spacing).
    // Other plugins (e.g. text centering) can call this to measure a line.
    Window_Base.prototype.andrewPictureWidth = function(name, lineHeight) {
        return this.andrewPictureLayout(name, lineHeight || this.lineHeight()).advance;
    };

    Window_Base.prototype.andrewProcessPicture = function(textState) {
        var m = /^\[([^\]]*)\]/.exec(textState.text.slice(textState.index));
        if (!m) return;
        textState.index += m[0].length;

        if (!textState.height) textState.height = this.lineHeight();
        var L = this.andrewPictureLayout(m[1], textState.height);
        var bitmap = L.bitmap;
        Andrew.TextPic.log('draw "' + L.name + '"', L.ext || '(no ext)', 'mode=' + L.mode,
            bitmap ? ('ready=' + bitmap.isReady() + ' size=' + bitmap.width + 'x' + bitmap.height +
                      ' error=' + (bitmap.isError ? bitmap.isError() : '?')) : 'no bitmap',
            'lineHeight=' + textState.height, 'advance=' + L.advance);

        if (L.mode === 'image') {
            var dy = textState.y + Math.floor((textState.height - L.h) / 2);
            this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height,
                              textState.x, dy, L.w, L.h);
        } else if (L.mode === 'text') {
            // Missing/broken picture: show the original text instead
            this.contents.drawText(L.label, textState.x, textState.y, L.w * 2, textState.height);
        }
        textState.x += L.advance;
    };

    //-------------------------------------------------------------------------
    // Window_Message: re-run conversion after startMessage (covers plugins
    // that alias the conversion chain differently) and wait for pictures
    //-------------------------------------------------------------------------
    var _Window_Message_startMessage = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function() {
        _Window_Message_startMessage.call(this);
        if (this._textState && this._textState.text) {
            this._textState.text = Andrew.TextPic.convertTags(this._textState.text, this);
            Andrew.TextPic.log('message text:', JSON.stringify(this._textState.text));
        }
    };

    var _Game_Message_add = Game_Message.prototype.add;
    Game_Message.prototype.add = function(text) {
        Andrew.TextPic.log('Game_Message.add:', JSON.stringify(text));
        if (Andrew.TextPic.debug) console.log(new Error('Game_Message.add called from').stack);
        _Game_Message_add.call(this, text);
    };

    var _Game_Message_allText = Game_Message.prototype.allText;
    Game_Message.prototype.allText = function() {
        var result = _Game_Message_allText.call(this);
        Andrew.TextPic.log('Game_Message.allText:', JSON.stringify(result));
        return result;
    };

    var _Window_Message_updateLoading = Window_Message.prototype.updateLoading;
    Window_Message.prototype.updateLoading = function() {
        if (this._andrewPicPending && this._andrewPicPending.length > 0) {
            var done = this._andrewPicPending.every(function(b) {
                return b.isReady() || (b.isError && b.isError());
            });
            if (!done) return true;
            this._andrewPicPending = [];
        }
        return _Window_Message_updateLoading.call(this);
    };

})();
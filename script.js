// Audio context and sample buffer
let audioContext;
let sampleBuffer;

// Multiple voices (samples)
let voices = [];
let currentVoiceId = null;
let nextVoiceId = 1;

// Master output chain
let masterGain;
let masterCompressor;

// Current mode
let currentMode = 'scale'; // 'scale' or 'chord'
let fadeOutMode = true; // Whether to fade out previous notes when new ones play
let isExportingSamples = false;

// Track active audio sources for fade-out
let activeSources = [];

// Keyboard mapping: key -> semitone offset from root (C4)
// C major scale: C D E F G A B C (full octave)
const SCALE_MAP = {
    // Octave -1 (C3-C4)
    'z': -12, 'x': -10, 'c': -8, 'v': -7, 'm': -5, ',': -3, '.': -1, '/': 0,
    // Root Octave (C4-C5)
    'a': 0, 's': 2, 'd': 4, 'f': 5, 'j': 7, 'k': 9, 'l': 11, ';': 12,
    // Octave +1 (C5-C6)
    'q': 12, 'w': 14, 'e': 16, 'r': 17, 'u': 19, 'i': 21, 'o': 23, 'p': 24
};

const KEYBOARD_ROWS = {
    high: { fileLabel: 'octave-up', keys: ['q', 'w', 'e', 'r', 'u', 'i', 'o', 'p'] },
    mid: { fileLabel: 'root-octave', keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] },
    low: { fileLabel: 'octave-down', keys: ['z', 'x', 'c', 'v', 'm', ',', '.', '/'] }
};

const EXPORT_ROW_ORDER = ['low', 'mid', 'high'];

// Chord mode: I-V-vi-IV progression (C major key)
// Each chord is an array of semitone offsets
const CHORD_MAP = {
    // Bottom row: -2 and -1 octaves (C1, G1, Am1, F1, C2, G2, Am2, F2)
    'z': [-24, -20, -17],  // C chord, -2 octaves
    'x': [-17, -12, -10],  // G chord, -2 octaves  
    'c': [-21, -17, -14],  // Am chord, -2 octaves
    'v': [-19, -12, -8],   // F chord, -2 octaves
    'm': [-12, -8, -5],    // C chord, -1 octave
    ',': [-5, 0, 2],       // G chord, -1 octave
    '.': [-9, -5, -2],     // Am chord, -1 octave
    '/': [-7, 0, 4],       // F chord, -1 octave
    // Middle row: 0 and +1 octaves (C3, G3, Am3, F3, C4, G4, Am4, F4)
    'a': [0, 4, 7],        // C chord, root octave
    's': [7, 12, 14],      // G chord, root octave
    'd': [3, 7, 10],       // Am chord, root octave
    'f': [5, 12, 16],      // F chord, root octave
    'j': [12, 16, 19],     // C chord, +1 octave
    'k': [19, 24, 26],     // G chord, +1 octave
    'l': [15, 19, 22],     // Am chord, +1 octave
    ';': [17, 24, 28],     // F chord, +1 octave
    // Top row: +2 and +3 octaves (C5, G5, Am5, F5, C6, G6, Am6, F6)
    'q': [24, 28, 31],     // C chord, +2 octaves
    'w': [31, 36, 38],     // G chord, +2 octaves
    'e': [27, 31, 34],     // Am chord, +2 octaves
    'r': [29, 36, 40],     // F chord, +2 octaves
    'u': [36, 40, 43],     // C chord, +3 octaves
    'i': [43, 48, 50],     // G chord, +3 octaves
    'o': [39, 43, 46],     // Am chord, +3 octaves
    'p': [41, 48, 52]      // F chord, +3 octaves
};

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORD_NAMES = ['C', 'G', 'Am', 'F'];
const FILE_KEY_NAMES = {
    ',': 'comma',
    '.': 'period',
    '/': 'slash',
    ';': 'semicolon'
};

// Track which keys are currently pressed
const activeKeys = new Set();

// Loop recording state
let isRecording = false;
let isLooping = false;
let recordingStartTime = null;
let recordedEvents = [];
let loopLength = 0;
let loopTimeoutId = null;

// DOM elements
const fileInput = document.getElementById('audio-file');
const fileStatus = document.getElementById('file-status');
const keyboardHigh = document.getElementById('keyboard-high');
const keyboardMid = document.getElementById('keyboard-mid');
const keyboardLow = document.getElementById('keyboard-low');
const modeSelect = document.getElementById('mode-select');
const fadeOutToggle = document.getElementById('fade-out-toggle');
const voicesList = document.getElementById('voices-list');
const exportSamplesBtn = document.getElementById('export-samples-btn');
const exportStatus = document.getElementById('export-status');

// Loop controls
const loopRecordBtn = document.getElementById('loop-record-btn');
const loopStopRecordBtn = document.getElementById('loop-stop-record-btn');
const loopPlayBtn = document.getElementById('loop-play-btn');
const loopStopBtn = document.getElementById('loop-stop-loop-btn');
const loopClearBtn = document.getElementById('loop-clear-btn');
const loopStatus = document.getElementById('loop-status');

// Initialize the app
function init() {
    // Create visual keyboard
    createVisualKeyboard();
    
    // Set up file upload handler
    fileInput.addEventListener('change', handleFileUpload);
    
    // Set up mode selector
    modeSelect.addEventListener('change', handleModeChange);
    
    // Set up fade-out toggle
    fadeOutToggle.addEventListener('change', handleFadeOutToggle);

    // Set up sample export
    if (exportSamplesBtn) {
        exportSamplesBtn.addEventListener('click', exportCurrentVoiceSamples);
    }

    // Set up loop controls
    if (loopRecordBtn && loopStopRecordBtn && loopPlayBtn && loopStopBtn && loopClearBtn) {
        loopRecordBtn.addEventListener('click', startRecordingLoop);
        loopStopRecordBtn.addEventListener('click', stopRecordingLoop);
        loopPlayBtn.addEventListener('click', startLoopPlayback);
        loopStopBtn.addEventListener('click', stopLoopPlayback);
        loopClearBtn.addEventListener('click', clearLoop);
    }

    // Set up voices list interactions
    if (voicesList) {
        voicesList.addEventListener('click', handleVoicesListClick);
    }
    
    // Set up keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    updateExportControls();
}

// Handle mode change
function handleModeChange(event) {
    currentMode = event.target.value;
    createVisualKeyboard();
    
    // Toggle instructions
    const scaleInstructions = document.getElementById('scale-instructions');
    const chordInstructions = document.getElementById('chord-instructions');
    
    if (currentMode === 'scale') {
        scaleInstructions.style.display = 'block';
        chordInstructions.style.display = 'none';
    } else {
        scaleInstructions.style.display = 'none';
        chordInstructions.style.display = 'block';
    }

    updateExportControls();
}

// Handle fade-out toggle
function handleFadeOutToggle(event) {
    fadeOutMode = event.target.checked;
}

// Voice management helpers
function getCurrentVoice() {
    return voices.find(voice => voice.id === currentVoiceId) || null;
}

function updateExportControls(statusText) {
    if (!exportSamplesBtn && !exportStatus) return;

    const currentVoice = getCurrentVoice();
    if (exportSamplesBtn) {
        exportSamplesBtn.disabled = isExportingSamples || !currentVoice;
    }

    if (!exportStatus) return;

    if (statusText !== undefined) {
        exportStatus.textContent = statusText;
        return;
    }

    if (!currentVoice) {
        exportStatus.textContent = 'Load a sound file to export samples.';
        return;
    }

    const modeLabel = currentMode === 'scale' ? 'note' : 'chord';
    exportStatus.textContent = `Ready to export ${modeLabel} samples from ${currentVoice.name}.`;
}

function renderVoices() {
    if (!voicesList) return;

    voicesList.innerHTML = '';

    if (voices.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'voices-empty';
        empty.textContent = 'No voices loaded. Use "Load Sound File" to add one or more sounds.';
        voicesList.appendChild(empty);
        updateExportControls();
        return;
    }

    voices.forEach(voice => {
        const item = document.createElement('div');
        item.className = 'voice-item' + (voice.id === currentVoiceId ? ' active' : '');
        item.dataset.voiceId = String(voice.id);

        item.innerHTML = `
            <button class="voice-select" type="button">${voice.name}</button>
            <button class="voice-remove" type="button" aria-label="Remove voice">&times;</button>
        `;

        voicesList.appendChild(item);
    });

    updateExportControls();
}

function addVoice(name, buffer) {
    const id = nextVoiceId++;
    voices.push({ id, name, buffer });
    currentVoiceId = id;
    sampleBuffer = buffer;
    renderVoices();
}

function handleVoicesListClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const item = target.closest('.voice-item');
    if (!item) return;

    const id = Number(item.dataset.voiceId);
    const voice = voices.find(v => v.id === id);
    if (!voice) return;

    if (target.classList.contains('voice-remove')) {
        // Remove voice
        voices = voices.filter(v => v.id !== id);
        if (currentVoiceId === id) {
            if (voices.length > 0) {
                const newCurrent = voices[voices.length - 1];
                currentVoiceId = newCurrent.id;
                sampleBuffer = newCurrent.buffer;
            } else {
                currentVoiceId = null;
                sampleBuffer = null;
            }
        }
        renderVoices();
    } else if (target.classList.contains('voice-select')) {
        // Select voice
        currentVoiceId = id;
        sampleBuffer = voice.buffer;
        renderVoices();
    }
}

// Loop recorder helpers
function updateLoopStatus(text) {
    if (loopStatus) {
        loopStatus.textContent = text;
    }
}

function updateLoopButtons() {
    if (!loopRecordBtn || !loopStopRecordBtn || !loopPlayBtn || !loopStopBtn || !loopClearBtn) return;

    loopRecordBtn.disabled = isRecording;
    loopStopRecordBtn.disabled = !isRecording;
    loopPlayBtn.disabled = isRecording || recordedEvents.length === 0 || isLooping;
    loopStopBtn.disabled = !isLooping;
    loopClearBtn.disabled = isRecording || recordedEvents.length === 0;
}

function startRecordingLoop() {
    if (!audioContext) {
        // Require audio to be initialized (user must have loaded a sample first)
        updateLoopStatus('Load a sound file before recording a loop.');
        return;
    }

    isRecording = true;
    isLooping = false;
    recordedEvents = [];
    loopLength = 0;
    if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
        loopTimeoutId = null;
    }

    recordingStartTime = audioContext.currentTime;
    updateLoopStatus('Recording loop... Play on your keyboard, then press Stop Recording.');
    updateLoopButtons();
}

function stopRecordingLoop() {
    isRecording = false;

    if (recordedEvents.length === 0) {
        updateLoopStatus('No events recorded.');
        updateLoopButtons();
        return;
    }

    const lastEvent = recordedEvents[recordedEvents.length - 1];
    loopLength = Math.max(lastEvent.timeOffset + 0.1, 0.1);

    updateLoopStatus(`Recorded loop of length ${loopLength.toFixed(2)}s. Press Play Loop to start looping.`);
    updateLoopButtons();
}

function clearLoop() {
    isRecording = false;
    isLooping = false;
    recordedEvents = [];
    loopLength = 0;
    if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
        loopTimeoutId = null;
    }

    updateLoopStatus('Loop cleared.');
    updateLoopButtons();
}

function scheduleLoopIteration() {
    if (!audioContext || recordedEvents.length === 0) return;

    recordedEvents.forEach(event => {
        const delayMs = event.timeOffset * 1000;
        setTimeout(() => {
            if (!isLooping) return;

            // Apply fade-out behavior based on how the loop was recorded
            if (event.fadeOutModeAtRecord) {
                fadeOutActiveSounds();
            }

            if (event.mode === 'scale') {
                playNote(SCALE_MAP[event.key], 1.0, event.buffer);
            } else if (event.mode === 'chord') {
                playChord(CHORD_MAP[event.key], event.buffer);
            }
        }, delayMs);
    });
}

function startLoopPlayback() {
    if (!audioContext || recordedEvents.length === 0 || loopLength <= 0) {
        updateLoopStatus('No loop to play. Record a loop first.');
        return;
    }

    isLooping = true;
    updateLoopButtons();

    scheduleLoopIteration();

    function scheduleNext() {
        if (!isLooping) return;
        loopTimeoutId = setTimeout(() => {
            if (!isLooping) return;
            scheduleLoopIteration();
            scheduleNext();
        }, loopLength * 1000);
    }

    scheduleNext();
    updateLoopStatus('Loop playing. Press Stop Loop to stop.');
}

function stopLoopPlayback() {
    isLooping = false;
    if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
        loopTimeoutId = null;
    }

    updateLoopStatus('Loop stopped.');
    updateLoopButtons();
}

// Create the visual keyboard elements
function createVisualKeyboard() {
    // Clear existing keyboards
    keyboardHigh.innerHTML = '';
    keyboardMid.innerHTML = '';
    keyboardLow.innerHTML = '';
    
    const keyboards = {
        high: { element: keyboardHigh, keys: KEYBOARD_ROWS.high.keys },
        mid: { element: keyboardMid, keys: KEYBOARD_ROWS.mid.keys },
        low: { element: keyboardLow, keys: KEYBOARD_ROWS.low.keys }
    };
    
    if (currentMode === 'scale') {
        Object.values(keyboards).forEach(keyboard => {
            keyboard.keys.forEach(key => {
                const keyElement = document.createElement('div');
                keyElement.className = 'key';
                keyElement.dataset.key = key;
                
                const semitoneOffset = SCALE_MAP[key];
                const noteIndex = ((semitoneOffset % 12) + 12) % 12;
                const noteName = NOTE_NAMES[noteIndex];
                
                keyElement.innerHTML = `
                    <span class="key-label">${key.toUpperCase()}</span>
                    <span class="note-label">${noteName}</span>
                `;
                
                keyboard.element.appendChild(keyElement);
            });
        });
    } else if (currentMode === 'chord') {
        Object.values(keyboards).forEach(keyboard => {
            keyboard.keys.forEach((key, index) => {
                const keyElement = document.createElement('div');
                keyElement.className = 'key';
                keyElement.dataset.key = key;
                
                const chordName = CHORD_NAMES[index % 4];
                
                keyElement.innerHTML = `
                    <span class="key-label">${key.toUpperCase()}</span>
                    <span class="note-label">${chordName}</span>
                `;
                
                keyboard.element.appendChild(keyElement);
            });
        });
    }
}

// Handle file upload
async function handleFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    try {
        // Initialize AudioContext on user interaction (browser autoplay policy)
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        
        // Set up master gain and compressor once
        if (!masterGain) {
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.8; // leave some headroom

            masterCompressor = audioContext.createDynamicsCompressor();
            masterCompressor.threshold.setValueAtTime(-18, audioContext.currentTime);
            masterCompressor.knee.setValueAtTime(30, audioContext.currentTime);
            masterCompressor.ratio.setValueAtTime(6, audioContext.currentTime);
            masterCompressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            masterCompressor.release.setValueAtTime(0.25, audioContext.currentTime);

            masterGain.connect(masterCompressor);
            masterCompressor.connect(audioContext.destination);
        }
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        const label = files.length === 1 ? files[0].name : `${files.length} files`;
        fileStatus.textContent = `Loading ${label}...`;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                addVoice(file.name, buffer);
            } catch (fileError) {
                console.error('Error loading audio file:', file.name, fileError);
            }
        }

        if (voices.length > 0) {
            const countLabel = files.length === 1 ? files[0].name : `${files.length} files`;
            fileStatus.textContent = `✓ Loaded: ${countLabel}`;
            fileStatus.style.color = '#4CAF50';
        } else {
            fileStatus.textContent = 'No valid audio files loaded.';
            fileStatus.style.color = '#f44336';
        }
        
    } catch (error) {
        console.error('Error loading audio file(s):', error);
        fileStatus.textContent = `Error loading file(s). Please try different audio files.`;
        fileStatus.style.color = '#f44336';
    }
}

function getModeExportLabel(mode) {
    return mode === 'scale' ? 'note' : 'chord';
}

function getNoteNameForOffset(semitoneOffset) {
    const noteIndex = ((semitoneOffset % 12) + 12) % 12;
    return NOTE_NAMES[noteIndex];
}

function getNoteLabelWithOctave(semitoneOffset) {
    const octave = 4 + Math.floor(semitoneOffset / 12);
    return `${getNoteNameForOffset(semitoneOffset)}${octave}`;
}

function getKeyFileLabel(key) {
    return FILE_KEY_NAMES[key] || key.toLowerCase();
}

function sanitizeFileNamePart(value) {
    return String(value)
        .trim()
        .replace(/#/g, 'sharp')
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function getSampleBaseName(fileName) {
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
    return sanitizeFileNamePart(withoutExtension) || 'sample';
}

function getExportEntriesForMode(mode) {
    const entries = [];

    EXPORT_ROW_ORDER.forEach(rowId => {
        const row = KEYBOARD_ROWS[rowId];

        row.keys.forEach((key, rowIndex) => {
            const keyLabel = getKeyFileLabel(key);
            const indexLabel = String(entries.length + 1).padStart(2, '0');

            if (mode === 'scale') {
                const semitoneOffset = SCALE_MAP[key];
                const noteLabel = getNoteLabelWithOctave(semitoneOffset);
                const fileNoteLabel = sanitizeFileNamePart(noteLabel);

                entries.push({
                    label: `${noteLabel} (${key.toUpperCase()})`,
                    fileName: `${row.fileLabel}/${indexLabel}-${fileNoteLabel}-key-${keyLabel}.wav`,
                    semitoneOffsets: [semitoneOffset],
                    volumeScale: 1
                });
            } else {
                const chordName = CHORD_NAMES[rowIndex % CHORD_NAMES.length];
                const fileChordLabel = sanitizeFileNamePart(chordName);

                entries.push({
                    label: `${chordName} (${key.toUpperCase()})`,
                    fileName: `${row.fileLabel}/${indexLabel}-${fileChordLabel}-key-${keyLabel}.wav`,
                    semitoneOffsets: CHORD_MAP[key],
                    volumeScale: 1 / CHORD_MAP[key].length
                });
            }
        });
    });

    return entries;
}

async function renderSampleEntry(buffer, entry) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) {
        throw new Error('Offline audio rendering is not supported in this browser.');
    }

    const renderDuration = Math.max(
        ...entry.semitoneOffsets.map(offset => {
            const playbackRate = Math.pow(2, offset / 12);
            return buffer.duration / playbackRate;
        })
    );
    const frameCount = Math.max(1, Math.ceil(renderDuration * buffer.sampleRate));
    const offlineContext = new OfflineContext(buffer.numberOfChannels, frameCount, buffer.sampleRate);

    entry.semitoneOffsets.forEach(offset => {
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(Math.pow(2, offset / 12), 0);

        const gainNode = offlineContext.createGain();
        gainNode.gain.setValueAtTime(entry.volumeScale, 0);

        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        source.start(0);
    });

    return offlineContext.startRendering();
}

function getAudioBufferPeak(buffer) {
    let peak = 0;

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);

        for (let index = 0; index < data.length; index++) {
            peak = Math.max(peak, Math.abs(data[index]));
        }
    }

    return peak;
}

function audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);
    const channelData = [];
    const normalizationGain = 1 / Math.max(1, getAudioBufferPeak(buffer));

    for (let channel = 0; channel < numberOfChannels; channel++) {
        channelData.push(buffer.getChannelData(channel));
    }

    writeAsciiString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAsciiString(view, 8, 'WAVE');
    writeAsciiString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeAsciiString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let frame = 0; frame < buffer.length; frame++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channelData[channel][frame] * normalizationGain));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, intSample, true);
            offset += bytesPerSample;
        }
    }

    return wavBuffer;
}

function writeAsciiString(view, offset, value) {
    for (let index = 0; index < value.length; index++) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
}

let crcTable = null;

function getCrcTable() {
    if (crcTable) return crcTable;

    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
        let value = index;

        for (let bit = 0; bit < 8; bit++) {
            value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        }

        crcTable[index] = value >>> 0;
    }

    return crcTable;
}

function calculateCrc32(data) {
    const table = getCrcTable();
    let crc = 0xffffffff;

    for (let index = 0; index < data.length; index++) {
        crc = table[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date) {
    const year = Math.max(1980, date.getFullYear());

    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

function createZipBlob(files) {
    const encoder = new TextEncoder();
    const now = getDosDateTime(new Date());
    const parts = [];
    const centralDirectoryParts = [];
    let offset = 0;

    files.forEach(file => {
        const nameBytes = encoder.encode(file.name);
        const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
        const crc = calculateCrc32(data);

        const localHeader = new ArrayBuffer(30 + nameBytes.length);
        const localView = new DataView(localHeader);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, now.time, true);
        localView.setUint16(12, now.date, true);
        localView.setUint32(14, crc, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, nameBytes.length, true);
        localView.setUint16(28, 0, true);
        new Uint8Array(localHeader, 30).set(nameBytes);

        parts.push(localHeader, data);

        const centralHeader = new ArrayBuffer(46 + nameBytes.length);
        const centralView = new DataView(centralHeader);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, now.time, true);
        centralView.setUint16(14, now.date, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        new Uint8Array(centralHeader, 46).set(nameBytes);

        centralDirectoryParts.push(centralHeader);
        offset += localHeader.byteLength + data.byteLength;
    });

    const centralDirectoryOffset = offset;
    centralDirectoryParts.forEach(part => {
        parts.push(part);
        offset += part.byteLength;
    });
    const centralDirectorySize = offset - centralDirectoryOffset;

    const endRecord = new ArrayBuffer(22);
    const endView = new DataView(endRecord);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralDirectorySize, true);
    endView.setUint32(16, centralDirectoryOffset, true);
    endView.setUint16(20, 0, true);
    parts.push(endRecord);

    return new Blob(parts, { type: 'application/zip' });
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportCurrentVoiceSamples() {
    const currentVoice = getCurrentVoice();
    if (!currentVoice || isExportingSamples) return;

    const mode = currentMode;
    const modeLabel = getModeExportLabel(mode);
    const sampleBaseName = getSampleBaseName(currentVoice.name);
    const zipRoot = `${sampleBaseName}-${modeLabel}-samples`;
    const entries = getExportEntriesForMode(mode);
    const zipFiles = [];
    let finalStatus = '';

    try {
        isExportingSamples = true;

        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            updateExportControls(`Rendering ${index + 1}/${entries.length}: ${entry.label}`);
            await new Promise(resolve => setTimeout(resolve, 0));

            const renderedBuffer = await renderSampleEntry(currentVoice.buffer, entry);
            const wavBuffer = audioBufferToWav(renderedBuffer);
            zipFiles.push({
                name: `${zipRoot}/${entry.fileName}`,
                data: new Uint8Array(wavBuffer)
            });
        }

        updateExportControls('Building zip file...');
        const zipBlob = createZipBlob(zipFiles);
        downloadBlob(zipBlob, `${zipRoot}.zip`);
        finalStatus = `Exported ${entries.length} ${modeLabel} samples.`;
    } catch (error) {
        console.error('Error exporting sample zip:', error);
        finalStatus = 'Export failed. Try a shorter sound file or another browser.';
    } finally {
        isExportingSamples = false;
        updateExportControls(finalStatus || undefined);
    }
}

// Play a note with given semitone offset
function playNote(semitoneOffset, volumeScale = 1.0, bufferOverride = null) {
    const buffer = bufferOverride || sampleBuffer;
    if (!buffer || !audioContext) return;
    
    try {
        // Create a new buffer source for each note
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Calculate playback rate for pitch shifting
        // Formula: 2^(semitones / 12)
        const playbackRate = Math.pow(2, semitoneOffset / 12);
        source.playbackRate.value = playbackRate;
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volumeScale;
        
        // Connect source -> gain -> master/output
        source.connect(gainNode);
        if (masterGain) {
            gainNode.connect(masterGain);
        } else {
            gainNode.connect(audioContext.destination);
        }
        source.start(0);
        
        // Store reference for potential fade-out
        const sourceInfo = { source, gainNode, startTime: audioContext.currentTime };
        activeSources.push(sourceInfo);
        
        // Clean up when sound finishes
        source.onended = () => {
            const index = activeSources.indexOf(sourceInfo);
            if (index > -1) {
                activeSources.splice(index, 1);
            }
        };
        
    } catch (error) {
        console.error('Error playing note:', error);
    }
}

// Fade out all currently playing sounds
function fadeOutActiveSounds() {
    const currentTime = audioContext.currentTime;
    const fadeTime = 0.1; // 100ms fade out
    
    activeSources.forEach(({ source, gainNode, startTime }) => {
        try {
            // Only fade if the sound has been playing for at least a tiny bit
            if (currentTime - startTime > 0.01) {
                gainNode.gain.cancelScheduledValues(currentTime);
                gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeTime);
                
                // Stop the source after fade completes
                source.stop(currentTime + fadeTime);
            }
        } catch (error) {
            // Source might already be stopped, that's okay
        }
    });
    
    // Clear the array since we're fading them all out
    activeSources = [];
}

// Play a chord (multiple notes)
function playChord(semitoneOffsets, bufferOverride = null) {
    if (!audioContext) return;
    
    // Reduce volume per note to prevent clipping when stacking
    const volumePerNote = 1.0 / semitoneOffsets.length;
    
    // Play each note in the chord with reduced volume
    semitoneOffsets.forEach(offset => {
        playNote(offset, volumePerNote, bufferOverride);
    });
}

// Handle key down event
function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    
    // Check if this key is in our mapping based on mode
    const keyMap = currentMode === 'scale' ? SCALE_MAP : CHORD_MAP;
    if (!(key in keyMap)) return;
    
    // Prevent repeat events when key is held down
    if (activeKeys.has(key)) return;
    
    // Prevent default browser behavior
    event.preventDefault();
    
    // Mark key as active
    activeKeys.add(key);
    
    // Fade out previous sounds if fade-out mode is enabled
    if (fadeOutMode) {
        fadeOutActiveSounds();
    }
    
    // Play the note or chord
    if (currentMode === 'scale') {
        playNote(SCALE_MAP[key]);
    } else {
        playChord(CHORD_MAP[key]);
    }

    // If recording, store this event relative to recording start
    if (isRecording && audioContext) {
        if (recordingStartTime === null) {
            recordingStartTime = audioContext.currentTime;
        }
        const timeOffset = audioContext.currentTime - recordingStartTime;
        recordedEvents.push({
            timeOffset,
            mode: currentMode,
            key,
            buffer: sampleBuffer,
            fadeOutModeAtRecord: fadeOutMode,
        });
        updateLoopStatus('Recording loop...');
        updateLoopButtons();
    }
    
    // Add visual feedback
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
}

// Handle key up event
function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    
    // Remove from active keys
    activeKeys.delete(key);
    
    // Remove visual feedback
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.remove('active');
    }
}

// Initialize when page loads
init();

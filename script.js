// Audio context and sample buffer
let audioContext;
let sampleBuffer;

// Current mode
let currentMode = 'scale'; // 'scale' or 'chord'
let fadeOutMode = true; // Whether to fade out previous notes when new ones play

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

// Track which keys are currently pressed
const activeKeys = new Set();

// DOM elements
const fileInput = document.getElementById('audio-file');
const fileStatus = document.getElementById('file-status');
const keyboardHigh = document.getElementById('keyboard-high');
const keyboardMid = document.getElementById('keyboard-mid');
const keyboardLow = document.getElementById('keyboard-low');
const modeSelect = document.getElementById('mode-select');
const fadeOutToggle = document.getElementById('fade-out-toggle');

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
    
    // Set up keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
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
}

// Handle fade-out toggle
function handleFadeOutToggle(event) {
    fadeOutMode = event.target.checked;
}

// Create the visual keyboard elements
function createVisualKeyboard() {
    // Clear existing keyboards
    keyboardHigh.innerHTML = '';
    keyboardMid.innerHTML = '';
    keyboardLow.innerHTML = '';
    
    const keyboards = {
        high: { element: keyboardHigh, keys: ['q', 'w', 'e', 'r', 'u', 'i', 'o', 'p'] },
        mid: { element: keyboardMid, keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] },
        low: { element: keyboardLow, keys: ['z', 'x', 'c', 'v', 'm', ',', '.', '/'] }
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
        // Chord names for I-V-vi-IV progression
        const chordNames = ['C', 'G', 'Am', 'F'];
        
        Object.values(keyboards).forEach(keyboard => {
            keyboard.keys.forEach((key, index) => {
                const keyElement = document.createElement('div');
                keyElement.className = 'key';
                keyElement.dataset.key = key;
                
                const chordName = chordNames[index % 4];
                
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
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Initialize AudioContext on user interaction (browser autoplay policy)
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        fileStatus.textContent = `Loading ${file.name}...`;
        
        // Read the file as an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Decode the audio data
        sampleBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        fileStatus.textContent = `✓ Loaded: ${file.name}`;
        fileStatus.style.color = '#4CAF50';
        
    } catch (error) {
        console.error('Error loading audio file:', error);
        fileStatus.textContent = `Error loading file. Please try a different audio file.`;
        fileStatus.style.color = '#f44336';
    }
}

// Play a note with given semitone offset
function playNote(semitoneOffset) {
    if (!sampleBuffer || !audioContext) return;
    
    try {
        // Create a new buffer source for each note
        const source = audioContext.createBufferSource();
        source.buffer = sampleBuffer;
        
        // Calculate playback rate for pitch shifting
        // Formula: 2^(semitones / 12)
        const playbackRate = Math.pow(2, semitoneOffset / 12);
        source.playbackRate.value = playbackRate;
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        // Connect source -> gain -> destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
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
function playChord(semitoneOffsets) {
    if (!sampleBuffer || !audioContext) return;
    
    // Play each note in the chord
    semitoneOffsets.forEach(offset => {
        playNote(offset);
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

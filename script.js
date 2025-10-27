// Audio context and sample buffer
let audioContext;
let sampleBuffer;

// Keyboard mapping: key -> semitone offset from root (C4)
// C major scale: C D E F G A B C (full octave)
const KEYBOARD_MAP = {
    // Octave -1 (C3-C4)
    'z': -12, 'x': -10, 'c': -8, 'v': -7, 'm': -5, ',': -3, '.': -1, '/': 0,
    // Root Octave (C4-C5)
    'a': 0, 's': 2, 'd': 4, 'f': 5, 'j': 7, 'k': 9, 'l': 11, ';': 12,
    // Octave +1 (C5-C6)
    'q': 12, 'w': 14, 'e': 16, 'r': 17, 'u': 19, 'i': 21, 'o': 23, 'p': 24
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

// Initialize the app
function init() {
    // Create visual keyboard
    createVisualKeyboard();
    
    // Set up file upload handler
    fileInput.addEventListener('change', handleFileUpload);
    
    // Set up keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

// Create the visual keyboard elements
function createVisualKeyboard() {
    const keyboards = {
        high: { element: keyboardHigh, keys: ['q', 'w', 'e', 'r', 'u', 'i', 'o', 'p'] },
        mid: { element: keyboardMid, keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] },
        low: { element: keyboardLow, keys: ['z', 'x', 'c', 'v', 'm', ',', '.', '/'] }
    };
    
    Object.values(keyboards).forEach(keyboard => {
        keyboard.keys.forEach(key => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.dataset.key = key;
            
            const semitoneOffset = KEYBOARD_MAP[key];
            const noteIndex = ((semitoneOffset % 12) + 12) % 12;
            const noteName = NOTE_NAMES[noteIndex];
            
            keyElement.innerHTML = `
                <span class="key-label">${key.toUpperCase()}</span>
                <span class="note-label">${noteName}</span>
            `;
            
            keyboard.element.appendChild(keyElement);
        });
    });
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
        
        // Connect to output and play
        source.connect(audioContext.destination);
        source.start(0);
        
    } catch (error) {
        console.error('Error playing note:', error);
    }
}

// Handle key down event
function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    
    // Check if this key is in our mapping
    if (!(key in KEYBOARD_MAP)) return;
    
    // Prevent repeat events when key is held down
    if (activeKeys.has(key)) return;
    
    // Prevent default browser behavior
    event.preventDefault();
    
    // Mark key as active
    activeKeys.add(key);
    
    // Play the note
    playNote(KEYBOARD_MAP[key]);
    
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

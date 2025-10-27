

Of course! Here is a comprehensive `plan.md` file for your chromatic keyboard app. This plan breaks down the project into manageable steps, defines the technical approach, and considers potential challenges.

---

# plan.md

## Project: Chromatic Keyboard Web App

### 1. Vision & Overview

A single-page web application that transforms the user's computer keyboard into a fully functional chromatic instrument. The user will be able to upload any audio sample (e.g., a piano note, a synth hit, a drum sound), which will be mapped to a root note (Middle C). They can then play a chromatic scale across three octaves directly from their keyboard, with visual feedback for each key press.

### 2. Core Features

1.  **Audio File Upload:** A simple interface to load a single audio file (e.g., `.wav`, `.mp3`, `.ogg`).
2.  **Root Note Mapping:** The uploaded sample is treated as Middle C (C4).
3.  **Chromatic Keyboard Layout:** A specific key mapping for playing all 12 semitones of an octave.
4.  **Multi-Octave Support:**
    *   **Octave Down:** The `z` through `.` row plays one octave below the root.
    *   **Root Octave:** The `a` through `;` row plays the root octave.
    *   **Octave Up:** The `q` through `p` row plays one octave above the root.
5.  **Visual Feedback:** The on-screen keyboard will highlight keys as they are pressed.
6.  **Real-time Audio:** Low-latency playback using the Web Audio API.

### 3. Technical Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+). This keeps the project lightweight and dependency-free.
*   **Audio Engine:** Web Audio API. This is essential for decoding audio files and manipulating playback rate for pitch shifting.
*   **Build Tool (Optional):** Vite or Parcel for a modern development workflow with hot-reloading.

### 4. UI/UX Design

The interface will be clean and minimal, focusing on the core functionality.

*   **Header:** Title of the app.
*   **Main Area:**
    *   **File Upload Section:** A prominent button or drag-and-drop area to load the sound file. Display the name of the currently loaded file.
    *   **Visual Keyboard:** A graphical representation of the three keyboard rows, showing which key corresponds to which musical note (e.g., `a` -> C, `s` -> C#, etc.).
*   **Footer:** Simple instructions or info.

**Wireframe Sketch:**

```
+-------------------------------------------+
|           Chromatic Keyboard              |
+-------------------------------------------+
|                                           |
|  [ Load Sound File ]  No file loaded.     |
|                                           |
|  +-------------------------------------+  |
|  |  q  w  e  r  t  y  u  i  o  p       |  |  <-- Octave Up (C5)
|  |  C  C# D  D# E  F  F# G  G# A  A#    |  |
|  +-------------------------------------+  |
|  |  a  s  d  f  g  h  j  k  l  ;       |  |  <-- Root Octave (C4)
|  |  C  C# D  D# E  F  F# G  G# A  A#    |  |
|  +-------------------------------------+  |
|  |  z  x  c  v  b  n  m  ,  .  /       |  |  <-- Octave Down (C3)
|  |  C  C# D  D# E  F  F# G  G# A  A#    |  |
|  +-------------------------------------+  |
|                                           |
+-------------------------------------------+
```
*Note: The layout above uses 10 keys per octave for the first 10 semitones. This is a practical adaptation of the user's requested rows.*

### 5. Detailed Implementation Plan

#### Phase 1: Basic Project Setup & HTML Structure
1.  Initialize project (`git init`, `npm init -y`).
2.  Create `index.html`, `style.css`, and `script.js`.
3.  Set up the basic HTML structure:
    *   A `header` for the title.
    *   A `main` section with an `input type="file"` and a container for the visual keyboard (`<div id="keyboard">`).
    *   Link `style.css` and `script.js` (with `defer`).

#### Phase 2: Audio Loading & Handling
1.  In `script.js`, get references to the file input and other DOM elements.
2.  Initialize the `AudioContext`: `const audioContext = new AudioContext();`.
3.  Add an event listener to the file input for the `change` event.
4.  Inside the event handler:
    *   Get the selected file (`event.target.files[0]`).
    *   Use the `FileReader` API to read the file as an `ArrayBuffer`.
    *   Once loaded, use `audioContext.decodeAudioData()` to decode the buffer into a playable `AudioBuffer`.
    *   Store this `AudioBuffer` in a global variable (e.g., `let sampleBuffer;`).
    *   Update the UI to show the file name.

#### Phase 3: Keyboard Mapping & Playback Logic
1.  **Define the Key-to-Note Mapping:** Create a JavaScript object to map keyboard keys to their semitone offset from the root note (Middle C).

    ```javascript
    const KEYBOARD_MAP = {
      // Octave -1 (12 semitones down from root)
      'z': -12, 'x': -11, 'c': -10, 'v': -9, 'b': -8, 'n': -7, 'm': -6, ',': -5, '.': -4, '/': -3,
      // Root Octave (0 semitones from root)
      'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7, 'l': 8, ';': 9,
      // Octave +1 (12 semitones up from root)
      'q': 12, 'w': 13, 'e': 14, 'r': 15, 't': 16, 'y': 17, 'u': 18, 'i': 19, 'o': 20, 'p': 21
    };
    ```

2.  **Create the `playNote` function:**
    *   This function will accept a `semitoneOffset` as an argument.
    *   It will create an `AudioBufferSourceNode`: `const source = audioContext.createBufferSource();`.
    *   Set its buffer: `source.buffer = sampleBuffer;`.
    *   **Pitch Shifting:** Calculate the `playbackRate`. The formula is `2^(semitones / 12)`.
        *   `const playbackRate = Math.pow(2, semitoneOffset / 12);`
        *   `source.playbackRate.value = playbackRate;`
    *   Connect the source to the audio context's destination (speakers): `source.connect(audioContext.destination);`.
    *   Start playback immediately: `source.start(0);`.

3.  **Handle Keyboard Events:**
    *   Add a `keydown` event listener to the `window`.
    *   Check if the pressed key (`event.key.toLowerCase()`) exists in our `KEYBOARD_MAP`.
    *   If it does, call `playNote(KEYBOARD_MAP[event.key.toLowerCase()])`.
    *   Prevent default browser action for keys like spacebar.
    *   **Important:** To handle holding a key down, we need to prevent re-triggering. Use a `Set` or an object to track currently active keys. Only play a note if the key is not already in the set.

#### Phase 4: Visual Feedback
1.  **Generate the Visual Keyboard:** In `script.js`, on page load, dynamically create the visual keyboard elements based on the `KEYBOARD_MAP`. This avoids hardcoding HTML for every key. Each key should be a `div` with a class and a `data-key` attribute matching the keyboard key (e.g., `<div class="key" data-key="a">a<br>C</div>`).
2.  **Add CSS for styling:** Style the `.key` class, and add an `.active` class for the pressed state (e.g., different background color, shadow).
3.  **Connect UI to Keyboard Events:**
    *   In the `keydown` listener, find the corresponding visual key element: `document.querySelector(`[data-key="${key}"]`)`.
    *   If found, add the `.active` class.
    *   In a `keyup` listener, remove the `.active` class from the key element.

#### Phase 5: Polish & Refinement
1.  **Browser Autoplay Policy:** Modern browsers block audio until a user interacts with the page. The file upload interaction is a good trigger. We can `resume` the `AudioContext` on the first user interaction.
2.  **Error Handling:** Add `try...catch` blocks for file reading and audio decoding. Display user-friendly error messages.
3.  **Styling:** Refine the CSS to make the app look polished and professional. Add transitions for the `.active` state.

### 6. File Structure

```
/chromatic-keyboard-app
|-- index.html          # Main HTML structure
|-- style.css           # All styling
|-- script.js           # All application logic
|-- plan.md             # This file
|-- README.md           # Project description for others
```

### 7. Key Challenges & Considerations

*   **Pitch Shifting Artifacts:** Using `playbackRate` changes the duration of the sample. A note played an octave up will be twice as fast and high-pitched (the "chipmunk" effect). This is acceptable for this project's scope but is a limitation. More advanced pitch-shifting (e.g., using a phase vocoder) is complex.
*   **Audio Latency:** The Web Audio API is designed for low latency, but performance can vary. The goal is to make it feel as responsive as possible.
*   **Key Layout:** The proposed 10-key layout is a practical choice. A full 12-key chromatic layout might require using less convenient keys (e.g., `1`, `2`, etc.). This is a design trade-off.

### 8. Future Enhancements

*   **ADSR Envelope:** Add controls for Attack, Decay, Sustain, and Release to shape the sound of each note.
*   **Multiple Samples:** Allow users to load different samples for different octaves or keys.
*   **MIDI Support:** Add the ability to connect a MIDI keyboard and play the app.
*   **Recording:** Implement a feature to record the performance and download it as an audio file.
*   **Advanced Pitching:** Integrate a library like `tone.js` or `pitchshift.js` for higher quality pitch shifting that doesn't affect duration.

---
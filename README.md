# Chromatic Keyboard

A web application that transforms your computer keyboard into a chromatic musical instrument. Upload any audio sample and play it across three octaves using your keyboard!

## Features

- 🎹 **Three Octave Range**: Play notes across C3 to B5
- 🎵 **Any Sound Sample**: Upload any audio file (.wav, .mp3, .ogg) as your instrument
- ⌨️ **Keyboard Mapping**: Use QWERTY keyboard rows for intuitive playing
- 👀 **Visual Feedback**: See which keys are active as you play
- 🎼 **Real-time Audio**: Low-latency playback using Web Audio API

## How to Use

1. **Load a Sound File**: Click "Load Sound File" and select an audio file from your computer
2. **Play Music**: Use your keyboard to play notes in C major scale (full octave):
   - **Q W E R U I O P**: Octave Up (C5-C6)
   - **A S D F J K L ;**: Root Octave (C4-C5)
   - **Z X C V M , . /**: Octave Down (C3-C4)

## Keyboard Layout

```
q  w  e  r     u  i  o  p    <- Octave Up (C5)
C  D  E  F     G  A  B  C

a  s  d  f     j  k  l  ;    <- Root Octave (C4)
C  D  E  F     G  A  B  C

z  x  c  v     m  ,  .  /    <- Octave Down (C3)
C  D  E  F     G  A  B  C
```

## Technical Details

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+)
- **Audio Engine**: Web Audio API for audio decoding and pitch shifting
- **Pitch Shifting**: Uses playback rate manipulation (2^(semitones/12))

## Local Development

Simply open `index.html` in a modern web browser. No build process or dependencies required!

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/chromatickeyboard.git
   git push -u origin main
   ```
3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Under "Source", select "main" branch
   - Click Save
4. Your app will be live at: `https://yourusername.github.io/chromatickeyboard/`

## Browser Compatibility

Works in all modern browsers that support the Web Audio API:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Limitations

- Pitch shifting via playback rate changes both pitch and duration (chipmunk effect for higher notes)
- Latency may vary depending on browser and system performance

## Future Enhancements

- ADSR envelope controls
- Multiple sample support
- MIDI keyboard support
- Performance recording and export
- Advanced pitch shifting algorithms

## License

MIT License - feel free to use and modify!

# Hearing Diversity v2

A browser-based demo for comparing different ways of hearing.

## Purpose

Hearing loss is often misunderstood as simply “sound being quieter.”

In reality, hearing can vary widely depending on audiogram shape, hearing level, speech clarity, listening environment, hearing aids or cochlear implants, and individual auditory processing. Even people with similar hearing thresholds may experience speech and environmental sounds differently.

This tool is not designed to reproduce the actual hearing experience of deaf or hard-of-hearing people. Instead, it is a comparison demo: users listen to the same audio source under different conditions and compare how the sound changes when audiogram type, hearing level, and speech clarity settings are changed.

The goal is to help communicate three points:

1. Hearing loss is not only about volume.
2. People with hearing loss do not all hear in the same way.
3. Even when sound is present, speech may not be clear.

## Important note

この音は実際の難聴者の聞こえ方を再現するものではありません。  
聞こえ方の違いをイメージするためのサンプルです。

This processed audio does not reproduce the actual hearing experience of any specific deaf or hard-of-hearing person. It is a simplified sample for imagining differences in hearing.

For a more meaningful demo, keep the environment as consistent as possible:

- Use the same device.
- Use the same headphones or speakers.
- Keep the playback volume fixed.
- Use the same sample voice.
- Compare the original sound and processed sound under the same conditions.

## Features

### Audio sources

Users can choose one of the included sample voices or upload their own audio file.

Expected sample files:

```text
samples/female.mp3
samples/male.mp3
```

Uploaded audio files are processed locally in the browser. They are not sent to a server.

### Audiogram types

The app includes several simplified audiogram patterns:

- High-frequency gradually sloping loss
- High-frequency steeply sloping loss
- Low-frequency loss
- Flat loss
- Cookie-bite / dip type loss

The normal-hearing audiogram type was removed from v2 because the “original sound” button already works as the reference condition.

### Hearing level

Users can select a representative hearing level:

| Label | Target four-frequency average |
|---|---:|
| Normal | 20 dB |
| Mild hearing loss | 35 dB |
| Moderate hearing loss | 55 dB |
| Severe hearing loss | 80 dB |
| Profound hearing loss | 110 dB |

The app uses the four-frequency average:

```text
(500Hz + 1000Hz × 2 + 2000Hz) / 4
```

The selected audiogram shape is shifted so that its four-frequency average approaches the selected hearing level.

### Dynamic audiogram EQ

v2 links the visual audiogram and audio processing more directly.

The flow is:

```text
Selected audiogram type
×
Selected hearing level
↓
Adjusted audiogram points
↓
Dynamic EQ generated from those points
↓
Processed audio
```

This means that the EQ strength changes when the user changes either the audiogram type or the hearing level.

Bands marked as 120dB+ are treated as almost inaudible frequency regions in the demo and are strongly attenuated.

### Speech clarity

The speech clarity slider is a separate axis from the audiogram.

It modifies speech-like information by applying:

- High-frequency reduction
- Consonant-band reduction
- Slight temporal smearing
- Additional noise at lower clarity settings

This is intended to show that increasing volume alone does not necessarily restore speech understanding.

## Project structure

This ZIP is designed to be placed under a `/v2/` folder in the existing GitHub Pages repository.

```text
hearing-diversity/
└─ v2/
   ├─ index.html
   ├─ style.css
   ├─ app.js
   ├─ README.md
   ├─ robots.txt
   └─ samples/
      ├─ female.mp3
      └─ male.mp3
```

Public URL example:

```text
https://kuniy-deaf.github.io/hearing-diversity/v2/
```

## Source file overview

### `index.html`

Defines the page structure and user interface.

Main responsibilities:

- Header and project explanation
- Step 1: audio source selection
- Step 2: hearing profile selection
- Step 3: playback controls
- Audiogram SVG container
- Notes explaining that the sound is a simplified sample, not a reproduction

### `style.css`

Defines layout and visual presentation.

Main responsibilities:

- Responsive layout
- Panels and step sections
- Buttons, radio cards, and form controls
- Audiogram styling
- Speech banana and everyday sound label styles
- 120dB+ scale-out label styling

This file does not contain audio processing logic.

### `app.js`

Contains the simulator logic.

Main responsibilities:

#### Audio loading

```javascript
loadSampleVoice()
handleFile()
```

Loads the female/male sample MP3 files or a user-selected local audio file into an `AudioBuffer`.

#### Audiogram adjustment

```javascript
getFourFrequencyAverage()
getAdjustedAudiogramPoints()
```

Calculates the four-frequency average and shifts the selected audiogram shape to match the selected hearing level.

#### Dynamic EQ generation

```javascript
createAudiogramEQ()
hearingDbToEqGain()
```

Creates an EQ chain from the adjusted audiogram values. Higher dB HL values produce stronger attenuation. 120dB+ scale-out bands are strongly attenuated.

#### Speech clarity processing

```javascript
createClarityFilter()
createConsonantReductionFilter()
createTimeSmearDelay()
createNoise()
```

Applies additional processing to reduce speech clarity and demonstrate that speech understanding is not explained by volume alone.

#### Playback

```javascript
playAudio()
stopAll()
```

Plays either the original audio or the processed audio through the Web Audio API.

#### Audiogram rendering

```javascript
drawAudiogram()
drawSpeechBananaOverlay()
drawEverydaySoundOverlay()
```

Draws the adjusted audiogram, simplified speech banana, everyday sound labels, and 120dB+ indicators.

### `samples/`

Stores sample audio files.

Expected files:

```text
female.mp3
male.mp3
```

The repository can keep `samples/README.md` or `.gitkeep` until the actual MP3 files are uploaded.

## Privacy

All audio processing runs locally in the browser using the Web Audio API.

No uploaded audio is transmitted, stored, or analyzed on a server.

## Limitations

This demo is not a clinical hearing simulator.

It does not model:

- Individual auditory adaptation
- Hearing aid processing
- Cochlear implant processing
- Recruitment / loudness growth
- Real-world room acoustics
- Exact speech recognition scores
- Medical audiological diagnosis

Use this as a communication and comparison tool, not as a diagnostic or scientific reproduction of hearing loss.


## Audio samples

v2 uses the same sample voice files as the root version.

Do not duplicate audio files inside `v2/`.

Expected repository structure:

```text
hearing-diversity/
├─ samples/
│  ├─ female.mp3
│  └─ male.mp3
└─ v2/
   ├─ index.html
   ├─ style.css
   ├─ app.js
   ├─ README.md
   └─ robots.txt
```

The v2 application loads sample voices from:

```text
.../samples/female.mp3
.../samples/male.mp3
```

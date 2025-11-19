


#  **Choruser — Shadowing Tool **

**Choruser** is an in-progress browser-based tool designed to help Japanese learners practice **shadowing** with real-time prosody feedback. The goal is to combine looped listening, mimicry, recording, and automatic speech analysis to give learners visual insight into their **pitch accent**, **rhythm**, and **intonation** patterns.

While the project is still under active development, the current version includes core infrastructure for extracting subtitles from Japanese YouTube videos and preparing segments for future audio analysis.

---

## **Current Features (Implemented)**

### **YouTube Subtitle Selector**

* Working subtitle extraction system for on YouTube.
* Selects segments directly from the player interface and prepares them for looping.
* Supports both full-line and word-level timing where available.

### **Segment Collection Pipeline**

* Subtitle segments can be collected and queued for shadowing practice.
* Backend structure is set up for audio retrieval and processing.

### **Browser Extension Prototype**

* Early prototype interface for selecting subtitles and marking segments to shadow.
* Built to integrate natively with the YouTube player environment.

---

##  ** Features (In Development)**

### **Automatic Prosody Analysis**

Integration with Whisper, **torchaudio**, **librosa**, and **Praat/Parselmouth** for:

* f0 (pitch contour) extraction
* energy envelope extraction
* spectrogram visualization
* alignment of learner vs. target speech

### **Looped Shadowing & Recording**

* In-browser recording and playback
* Visual overlay comparing learner prosody with target prosody
* Repetition cycles for focused practice

### **Feedback Visualization**

* Pitch contour comparison
* Timing and rhythm alignment
* Simple similarity scores (future)

---

## **Tech Stack**

**Frontend / Extension:**

* JavaScript
* Browser Extension APIs
* YouTube DOM + subtitle parsing

---

##  **Motivation**

Shadowing/Chorusing is one of the most effective techniques for second-language speaking practice, especially for:

* pitch accent
* timing
* intonation
* fluidity

But learners often struggle to know *how close* they are to the target prosody.

Choruser aims to fill that gap by providing **visual, prosody-focused feedback**, especially for learners of Japanese where pitch accent plays a crucial role but is under-taught in traditional classrooms.

---


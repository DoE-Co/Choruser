


#  **Choruser — Shadowing Tool **

**Choruser** is an in-progress browser-based tool designed to help Japanese learners practice **shadowing** with real-time prosody feedback. The goal is to combine looped listening, mimicry, recording, and automatic speech analysis to give learners visual insight into their **pitch accent**, **rhythm**, and **intonation** patterns.

While the project is still under active development, the current version includes core infrastructure for extracting subtitles from Japanese YouTube videos and preparing segments for future audio analysis.

---

## **Current Features **

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


### **Automatic Prosody Analysis**


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

<img width="361" height="597" alt="image" src="https://github.com/user-attachments/assets/ea3d2246-904a-4962-955d-dc52b77c48ca" />
<img width="1498" height="774" alt="image" src="https://github.com/user-attachments/assets/8234e134-b475-4ec9-9909-f6450d99a101" />
<img width="1005" height="702" alt="image" src="https://github.com/user-attachments/assets/d78a1fe1-0959-4eab-b1be-72b29dc555c6" />
<img width="361" height="293" alt="image" src="https://github.com/user-attachments/assets/03013bb3-6301-4643-b8e0-ad64abc915a1" />


---

##  **Motivation**

Shadowing/Chorusing is one of the most effective techniques for second-language speaking practice, especially for:

* pitch accent
* timing
* intonation
* fluidity

This project aims to help make shadowing more efficent. 

---


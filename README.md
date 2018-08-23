# Web Audio API Metronome

This metronome achieves perfect timing using [Javascript’s Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).

It can be used as a case study for web apps where audio timing is key, such as audio applications or video games.

It’s an accessible and responsive application that degrades gracefully, allowing any browser that supports the API to use it.

It uses the design pattern showed in [this article](https://www.html5rocks.com/en/tutorials/audio/scheduling/) by [Chris Wilson](https://github.com/cwilso). However, this metronome allows for an immediate change of tempo and combines the worker into a single script. Moreover, thanks to [Pavle Goloskokovic's article](https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09), it’s iOS compatible.
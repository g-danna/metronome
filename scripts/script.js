'use strict';

// Global variables

var context, request, buffer;
var worker, workerBody;

var input = document.getElementById("tempo");
var tempo = input.value;
var frequency = 25; // Milliseconds
var lookahead = 0.1; // Seconds
var ticking = false;
var tickTime;

var defaultTempo = ["1", "2", "0"];

var playButton = document.getElementById("play-button");
var playButtonStroke = document.getElementsByClassName("fill")[2];
var minusButton = document.getElementById("minus-button");
var plusButton = document.getElementById("plus-button");
var curtain = document.getElementById("curtain");
var aboutButton = document.getElementById("about-button");
var body = document.getElementsByTagName("BODY")[0];

var downTimer, slideDown, upTimer, slideUp;

var pageFade;
var isCurtainUp = false;

var typeInTimer;
var hasTypeInEnded = false;

var color = {
    global: "#585858",
    background: "#fff",
    metronome: "#777",
    active: "#ee770f"
};

// Load audio context

function loadAudioContext() {

    window.AudioContext = window.AudioContext || window.webkitAudioContext ||
        alertIncompatibility();
    context = new AudioContext();
}

// Load audio file

function loadSound(url) {

    request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        context.decodeAudioData(request.response, function (toBeBuffer) {
            buffer = toBeBuffer;
        });
    };
    request.send();
}

// Ticking

function tick() {

    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(tickTime);
}

// Scheduler

function schedule() {

    while (tickTime < context.currentTime + lookahead) {
        tick();
        tickTime += 60 / tempo;
    }
}

// Worker

function buildWorker(body) {

    window.URL = window.URL || window.webkitURL || alertIncompatibility();
    window.Blob = window.Blob || window.webkitBlob || alertIncompatibility();

    // Monster regular expression by Daniel Manson – https://github.com/d1manson2
    var string = body.toString()
        .match(/^\s*function\s*\(\s*\)\s*\{(([\s\S](?!\}$))*[\s\S])/)[1];

    return new Worker(window.URL.createObjectURL(new Blob([string], {
        type: 'text/javascript'
    })));
}

function initiateWorker() {

    workerBody = function () {
        var frequency, scheduleTimer;
        self.onmessage = function (e) {
            if (e.data === "start") {
                scheduleTimer = setInterval(function () {
                    postMessage("tick");
                }, frequency);
            } else if (e.data === "stop") {
                clearInterval(scheduleTimer);
            } else if (e.data.frequency) {
                frequency = e.data.frequency;
            }
        };
    };

    worker = buildWorker(workerBody);
    worker.addEventListener("message", schedule);
    worker.postMessage({
        "frequency": frequency
    });
}

// Play & stop

function play() {

    if (Number(input.value) === 0 && !ticking) {
        return;
    }

    ticking = !ticking;

    if (ticking) {
        tickTime = context.currentTime;
        worker.postMessage("start");
        playButtonStroke.style.fill = color.active;
    } else {
        worker.postMessage("stop");
        playButtonStroke.style.fill = color.metronome;
    }
}

// Change input

function changeInput() {

    if (input.value.length > 3) {
        input.value = input.value.substr(0, 3);
    }

    if (Number(input.value) > input.max) {
        tempo = input.max;
    } else if (input.value === '') {
        return;
    } else {
        tempo = input.value;
    }

    tickTime = context.currentTime + 60 / tempo;
}

// Input focus & blur

function normalizeInput() {

    input.onfocus = function () {
        if (!hasTypeInEnded) {
            clearTimeout(typeInTimer);
            input.style.borderRight = "none";
            hasTypeInEnded = true;
            tempo = 120;
        }
        input.value = '';
    };

    // Allow users to type any value, but display the proper value on blur if they are out of bounds
    input.onblur = function () {
        if (Number(input.value) > input.max) {
            input.value = input.max;
        } else if (Number(input.value) < input.min) {
            input.value = input.min;
        } else if (input.value === '') {
            input.value = tempo;
        } else if (Number(input.value) === 0) {
            play();
        }
    };
}

// Decrease & increase

function decrease() {

    if (input.value === '') {
        input.value = tempo;
    }

    if (Number(input.value) > input.min) {
        input.value = Number(input.value) - 1;
        changeInput();

        // Stop the metronome if the tempo is 0
        if (Number(input.value) === 0) {
            play();
        }
    }
}

function increase() {

    if (input.value === '') {
        input.value = tempo;
    }

    if (Number(input.value) < input.max) {
        input.value = Number(input.value) + 1;
        changeInput();
    }
}

// Keys

function keyPress(e) {

    // Ignore key presses that aren't numbers
    if (e.charCode >= 48 && e.charCode <= 57) {
        input.focus();
    } else {
        input.blur();
    }
}

function keyDown(e) {

    // Down arrow
    if (e.keyCode === 40) {
        e.preventDefault();
        input.blur();
        decrease();

        // Up arrow
    } else if (e.keyCode === 38) {
        e.preventDefault();
        input.blur();
        increase();

        // Spacebar
    } else if (e.keyCode === 32) {
        e.preventDefault();
        play();

        // Return key
    } else if (e.keyCode === 13) {
        switch (document.activeElement.id) {
        case "minus-button":
            decrease();
            break;
        case "plus-button":
            increase();
            break;
        }
    }
}

function keyUp(e) {

    // Accessibility – restores visual feedback around slected elements for users that navigate using the tab bar
    if (e.keyCode === 9 && document.activeElement.tagName === "BUTTON") {
        document.activeElement.style.outlineWidth = "thin";
        document.activeElement.onblur = function () {
            this.style.outlineWidth = "0px";
        };
    }
}

// Buttons

// Make a fast decrease/increase if the user long-presses the button

function minusButtonDown() {

    decrease();
    downTimer = setTimeout(function () {
        slideDown = setInterval(function () {
            decrease();
        }, 25);
    }, 500);
}

function plusButtonDown() {

    increase();
    upTimer = setTimeout(function () {
        slideUp = setInterval(function () {
            increase();
        }, 25);
    }, 500);
}

function minusButtonUp() {

    clearTimeout(downTimer);
    clearInterval(slideDown);
}

function plusButtonUp() {

    clearTimeout(upTimer);
    clearInterval(slideUp);
}


// Curtain

function moveCurtain() {

    if (!isCurtainUp) {

        if (ticking) {
            play();
        }

        clearTimeout(pageFade);
        body.style.overflow = "visible";
        aboutButton.style.color = color.background;
        aboutButton.style.backgroundColor = color.active;
        curtain.className = "curtain-up";

        // Prevent user from acting on the metronome they don't see
        window.removeEventListener("keypress", keyPress);
        window.removeEventListener("keydown", keyDown);

    } else {
        pageFade = setTimeout(function () {
            body.style.overflow = "hidden";
        }, 500);
        aboutButton.style.color = color.global;
        aboutButton.style.backgroundColor = color.background;
        curtain.className = "curtain-down";

        window.addEventListener("keypress", keyPress);
        window.addEventListener("keydown", keyDown);
    }

    isCurtainUp = !isCurtainUp;
}

// Type-in clues

function typeIn(i) {

    typeInTimer = setTimeout(function () {
        input.value = input.value + defaultTempo[i];

        // Display the fake text cursor if the default tempo is being typed in
        if (i === 0) {
            input.style.borderRight = "1px solid " + color.metronome;
        } else if (i === 2) {
            changeInput();
            setTimeout(function () {
                input.style.borderRight = "none";
                hasTypeInEnded = true;
            }, 500);
        }

        if (i < 2) {
            typeIn(i += 1);
        }
    }, 300);
}

// Prevent default behavior

function preventDefault(e) {

    event.preventDefault();
    event.stopPropagation();
    return false;
}

// Alert incompatible browser

function alertIncompatibility() {

    var main = document.getElementsByTagName("MAIN")[0],
        navbar = document.getElementsByClassName("navbar")[0],
        dialog = document.getElementById("error-message");

    main.style.display = "none";
    main.setAttribute("aria-hidden", "true");
    navbar.style.display = "none";
    navbar.setAttribute("aria-hidden", "true");
    dialog.style.display = "block";
    dialog.setAttribute("aria-hidden", "false");
}

// Unlock Web Audio API for iOS devices

// Function by Pavle Goloskokovic – https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09

function webAudioTouchUnlock(context) {

    return new Promise(function (resolve, reject) {
        if (context.state === 'suspended' && 'ontouchstart' in window) {
            var unlock = function () {
                context.resume().then(function () {
                    document.body.removeEventListener('touchstart', unlock);
                    document.body.removeEventListener('touchend', unlock);

                    resolve(true);
                },
                    function (reason) {
                        reject(reason);
                    });
            };

            document.body.addEventListener('touchstart', unlock, false);
            document.body.addEventListener('touchend', unlock, false);
        } else {
            resolve(false);
        }
    });
}

// Window on load

window.onload = function () {

    loadAudioContext();
    webAudioTouchUnlock(context);
    loadSound("/assets/tick.wav");
    initiateWorker();

    input.addEventListener("input", changeInput);
    normalizeInput();


    playButton.addEventListener("click", play);
    window.addEventListener("keypress", keyPress);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    minusButton.addEventListener("mousedown", minusButtonDown);
    minusButton.addEventListener("touchend", minusButtonUp);
    minusButton.addEventListener("touchmove", minusButtonUp);
    minusButton.addEventListener("mouseup", minusButtonUp);
    minusButton.addEventListener("mouseout", minusButtonUp);

    plusButton.addEventListener("mousedown", plusButtonDown);
    plusButton.addEventListener("touchend", plusButtonUp);
    plusButton.addEventListener("touchmove", plusButtonUp);
    plusButton.addEventListener("mouseup", plusButtonUp);
    plusButton.addEventListener("mouseout", plusButtonUp);
    plusButton.addEventListener("mouseout", plusButtonUp);

    typeIn(0);

    // Prevent right-clicking on buttons and pasting into the input field
    minusButton.addEventListener("contextmenu", preventDefault);
    plusButton.addEventListener("contextmenu", preventDefault);
    input.addEventListener("paste", preventDefault);

    aboutButton.addEventListener("click", moveCurtain);

    WebFont.load({
        google: {
            families: ['Source Sans Pro:400,600', 'Roboto Slab:400']
        }
    });
};

var context;


function StepSynth(source) {


  var createAudioContext = function() {
    if (window.webkitAudioContext) {
      return new webkitAudioContext()
    } else if (window.AudioContext) {
      return new AudioContext()
    } else {
      alert("Web Audio not supported")
      throw new Error("Web Audio not supported (could not create audio context");
    }
  }

  var context = createAudioContext();
  var compressor = context.createDynamicsCompressor()
  compressor.connect(context.destination);
  var masterGain = context.createGain();
  masterGain.connect(compressor);
  masterGain.gain.value = 0.5;
  var oscillators = [];
  var currStep = 0;
  var isPlaying = false;
  var isMuted = false;

  var init = function() {
    console.log("initializing");
    var i = source.numOscillators;
    while (i > 0) {
      i--;
      var frequency = getFrequency(i);
      oscillators.push(createOscillator(frequency));
    }
    playSteps();
  }

  var createOscillator = function(frequency) {
    // Create oscillator and gain node.
    var oscillator = context.createOscillator(),
      gainNode = context.createGain();

    // Set the type and frequency of the oscillator.
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Set volume of the oscillator.
    gainNode.gain.value = 0;

    // Route oscillator through gain node to speakers.
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    // Start oscillator playing.
    oscillator.start(0);

    return {
      oscillator: oscillator,
      gain: gainNode.gain
    };
  };

  // TODO: use ENUM

  function setOscillatorsType(oscillatorType) {
    console.log("setOscillatorsType", oscillatorType)
    for (var i = 0; i < oscillators.length; i++) {
      var osc = oscillators[i].oscillator;
      osc.type = oscillatorType;
    }
  };


  function start() {
    isPlaying = true;
  };

  function getFrequency(n) {
    // http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
    //var f0 = 440;
    var f0 = 55;
    var a = Math.pow(2, 1 / 12.0);
    return f0 * Math.pow(a, n);
  }

  function mute() {
    isMuted = !isMuted;
    console.log('muting: ', isMuted);
    if (isMuted) {
      for (var i = 0; i < oscillators.length; i++) {
        oscillators[i].gain.value = 0;
      }
    }

  }

  function pause() {
    console.log('pausing / resuming ');
    isPlaying = !isPlaying;
  }

  var playSteps = function() {
    console.log('playSteps ');

    function loop() {
      var step = source.getStep(currStep);
      if (!isMuted) {
        for (var i = 0; i < oscillators.length; i++) {
          oscillators[i].gain.value = step[i];
        }
      }

      if (isPlaying) {
        currStep = (currStep + 1) % source.numSteps;
      }
      window.setTimeout(loop, source.stepDuration);

    }

    loop();
  }

  var setter = function(property) {
    return function(value) {
      property = value;
    };
  }

  var getter = function(property) {
    return function() {
      return property;
    };
  }

  init();

  return {
    mute: mute,
    pause: pause,
    setOscillatorsType: setOscillatorsType,
    getCompressor: getter(compressor),
    isMuted: getter(isMuted),
    isPlaying: getter(isPlaying),
    getMasterVolume: getter(masterGain.gain.value),
    setMasterVolume: setter(masterGain.gain.value),


  }
}


function CanvasSource(elementId, overlayId, numOscillators) {

  var canvas = document.getElementById(elementId);
  var context = canvas.getContext('2d');
  var overlayCanvas = document.getElementById(overlayId);
  var overlayContext = overlayCanvas.getContext('2d');
  var numOscillators = numOscillators;
  var numSteps = canvas.width;
  var heightScale = canvas.height / numOscillators;

  var markStep = function(stepIndex) {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayContext.beginPath();
    overlayContext.moveTo(stepIndex, 0);
    overlayContext.lineTo(stepIndex, overlayCanvas.height);
    overlayContext.stroke();
  }


  return {
    getStep: function(stepIndex) {
      // get just the corresponding row for this step
      var imageData = context.getImageData(stepIndex, 0, 1, canvas.height);
      var data = imageData.data;

      step = [];
      for (var y = 0; y < numOscillators; y++) {

        // Use scaling by averging the pixels in the scale
        var scaledY = parseInt(y * heightScale);
        var scaledYEnd = parseInt((y + 1) * heightScale);
        var pixelsToSum = scaledYEnd - scaledY;
        var alphaSum = 0;
        while (scaledY < scaledYEnd) {
          scaledY++;
          alphaSum += data[(scaledY) * 4 + 3];;
        }
        var alpha = alphaSum / pixelsToSum;
        step.push(alpha / 256);
      }

      markStep(stepIndex);
      return step;
    },
    numOscillators: numOscillators,
    numSteps: numSteps,
    stepDuration: 100
  }
}

function getScaledImageData(origCanvasId, width, height) {
  origCanvas = document.getElementById(origCanvasId).getContext('2d');

  var tempCanvas = document.createElement('canvas');
  var tempContext = prevCanvas.getContext('2d');
  tempContext.webkitImageSmoothingEnabled = false;
  tempContext.mozImageSmoothingEnabled = false;
  tempContext.imageSmoothingEnabled = false;

  tempContext.drawImage(origCanvas.canvas, 0, 0, width, height);
  return tempContext.getImageData(0, 0, width, height);
  //return prevCanvas.getImageData(0, 0, width, height);
}
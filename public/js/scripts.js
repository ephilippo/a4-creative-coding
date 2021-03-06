console.log("Welcome to the Resplendent Audio Visualizer Experience.  It's a pleasure to have you aboard.")

// Easy-access global constants
SPOKE_WIDTH = 2
VOLUME_START = 0.2
FRAMES_AFTER_PAUSE = 60


function toggleText() {
  let hideables = document.getElementsByClassName("hideable")
  
  for (var index = 0; index < hideables.length; index++) {
    let element = hideables[index]
    let vis = element.style.visibility
    
    if (vis === "hidden") {
      element.style.visibility = "visible"
    } else {
      element.style.visibility = "hidden"
    }
  }
}


window.onload = function() {
  // Get canvas and let it expand
  const visCanvas = document.querySelector("#visualizer")
  visCanvas.height = window.innerHeight
  visCanvas.width  = window.innerWidth
  
  // Set up audio and get stuff
  const { audioContext, analyzer, frequencies, gainNode } = initAudio()
  
  // Set up settings GUI
  settings = {
    shape: "Circle",
    spokes: 250,
    shapeFunc: drawCircle,
    volume: 1,
    playback: () => {fullToggle(visCanvas, analyzer, frequencies, audioContext)},
    toggleText: toggleText,
    gradient: "Vertical",
    fgColor: "#FFFFFF",
    bgColor1: "#080c18",
    bgColor2: "#1d2731"
  }  
  let baseGui = new dat.GUI();
  baseGui.add(settings, "playback").name("Play/Pause")
  baseGui.add(settings, "toggleText").name("Toggle Text")
  let volumeController = baseGui.add(settings, "volume", 0, 2).name("Volume")
  baseGui.add(settings, "spokes").name("Spokes")
  let shapeController = baseGui.add(settings, "shape", ["Circle", "Triangle"]).name("Shape")
  let colorGui = baseGui.addFolder("Colors")
  
  let gradController = colorGui.add(settings, "gradient", ["Solid", "Vertical", "Horizontal"]).name("Gradient")
  let fgController  = colorGui.addColor(settings, "fgColor").name("Shape")
  let bg1Controller = colorGui.addColor(settings, "bgColor1").name("Background 1")
  let bg2Controller = colorGui.addColor(settings, "bgColor2").name("Background 2")
  
  // Set shape
  shapeController.onChange(function(value) {
    switch (value) {
        case "Circle":
          settings.shapeFunc = drawCircle
          break;
        case "Triangle":
          settings.shapeFunc = drawTriangle
          break;
        default:
          console.error("Invalid shape chosen")
    }
    redrawOnChange(visCanvas, analyzer, frequencies)
  });
  // Set volume
  volumeController.onChange(function(vol) {
    gainNode.gain.value = vol * VOLUME_START;
  })
  
  // Redraw visible elements in case they're changed while music is paused.
  fgController.onChange(  function(_color){ redrawOnChange(visCanvas, analyzer, frequencies) })
  bg1Controller.onChange( function(_color){ redrawOnChange(visCanvas, analyzer, frequencies) })
  bg2Controller.onChange( function(_color){ redrawOnChange(visCanvas, analyzer, frequencies) })
  gradController.onChange(function(_color){ redrawOnChange(visCanvas, analyzer, frequencies) })
  
  // Draw the visualizer initially
  redrawVisualizer(visCanvas, analyzer, frequencies, 0)
}


function initAudio() {
  const audioElement = document.querySelector('audio');
  
  // Set up Web Audio API stuff
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();
  const analyzer = audioContext.createAnalyser();
  const track = audioContext.createMediaElementSource(audioElement);
  const gainNode = audioContext.createGain();
  gainNode.gain.value = VOLUME_START //starting value
  
  // Connect stuff together
  track.connect(analyzer);
  analyzer.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Set aside frequency array (global) and return analyzer
  const frequencies = new Uint8Array(analyzer.frequencyBinCount);
  return { audioContext, analyzer, frequencies, gainNode }
}


function fullToggle(visCanvas, analyzer, frequencies, audioContext) {
  togglePlayback(audioContext)
  //Start the animation loop
  redrawVisualizer(visCanvas, analyzer, frequencies, 0, true)
}


function redrawOnChange(canvas, analyzer, frequencies) {
  const audioElement = document.querySelector('audio')
  let isPaused = audioElement.paused
  
  // It already updates while playing, so don't double up
  if (isPaused) {
    redrawVisualizer(canvas, analyzer, frequencies, 0, true)
  }
}


function redrawVisualizer(canvas, analyzer, frequencies, framesLeft, continueLoop) {
  //Update frequency data
  analyzer.getByteFrequencyData(frequencies);
  
  //Paint over canvas and redraw shapes
  drawBackground(canvas)
  settings.shapeFunc(canvas, frequencies)
  
  // Only schedule next frame if playing
  const audioElement = document.querySelector('audio')
  if (!audioElement.paused && continueLoop) {
    framesLeft = FRAMES_AFTER_PAUSE
  } else {
    continueLoop = false
  }
  if (framesLeft > 0) {
    framesLeft--
    window.requestAnimationFrame(() => {redrawVisualizer(canvas, analyzer, frequencies, framesLeft, continueLoop)});
  }
}


function togglePlayback(audioContext) {
  const audioElement = document.querySelector('audio')
  let isPaused = audioElement.paused
  
  if (audioContext.state === 'suspended') {
      audioContext.resume();
  }
  if (!isPaused) {
    audioElement.pause();
  } else {
    audioElement.play();
  }
}


function drawBackground(canvas) {
    let context = canvas.getContext("2d")
    let gradient
    
    switch (settings.gradient) {
        case "Solid":
          gradient = context.createLinearGradient(0, 0, 0, canvas.height)
          gradient.addColorStop(0, settings.bgColor1)
          gradient.addColorStop(1, settings.bgColor1)
          break
        case "Vertical":
          gradient = context.createLinearGradient(0, 0, 0, canvas.height)
          gradient.addColorStop(0, settings.bgColor1)
          gradient.addColorStop(1, settings.bgColor2)
          break
        case "Horizontal":
          gradient = context.createLinearGradient(0, 0, canvas.width, 0)
          gradient.addColorStop(0, settings.bgColor1)
          gradient.addColorStop(1, settings.bgColor2)
          break
        default:
          Console.error("Invalid gradient parameter")
    }
    
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
}


function drawCircle(canvas, frequencies) {
  let context = canvas.getContext("2d")
  
  let shortAxis = Math.min(canvas.width, canvas.height)
  let x_mid = canvas.width  / 2
  let y_mid = canvas.height / 2
  
  let radius = shortAxis / 4
  let maxSpokeLen = shortAxis / 4
  
  // Draw the circle
  context.strokeStyle = settings.fgColor
  context.beginPath()
  context.arc(x_mid, y_mid, radius, 0, 2*Math.PI)
  context.stroke()
  
  // Draw the spokes
  for (pos = 0; pos < settings.spokes; pos++) {
    let angle = (2 * Math.PI / settings.spokes) * pos - (Math.PI / 2)
    
    let x = x_mid + radius * Math.cos(angle)
    let y = y_mid + radius * Math.sin(angle)
    
    let freqStep = frequencies.length / settings.spokes
    let freq = frequencies[Math.floor(pos * freqStep)]
    
    drawSpoke(context, x, y, angle, maxSpokeLen, freq)
  }
}


function drawTriangle(canvas, frequencies) {
  //Who knew triangles could be so complicated
  let context = canvas.getContext("2d")
  
  let shortAxisLen = Math.min(canvas.width, canvas.height)
  let x_mid = canvas.width  / 2
  let y_mid = canvas.height / 2
  
  let radius = shortAxisLen / 3
  let maxSpokeLen = shortAxisLen / 4
  
  // Top vertex
  let tx1 = x_mid
  let ty1 = y_mid - radius
  //Bottom right vertex
  let tx2 = x_mid + radius * Math.sin(Math.PI / 3)
  let ty2 = y_mid + radius * Math.cos(Math.PI / 3)
  //Bottom left vertex
  let tx3 = x_mid - radius * Math.sin(Math.PI / 3)
  let ty3 = ty2
  
  // Draw the triangle (not actually spokes)
  let sideLen = 2 * radius * Math.cos(Math.PI / 6)
  drawSpoke(context, tx1, ty1,  Math.PI/3, sideLen)
  drawSpoke(context, tx2, ty2,  Math.PI,   sideLen)
  drawSpoke(context, tx3, ty3, -Math.PI/3, sideLen)
  
  // Draw the spokes
  for (pos = 0; pos < settings.spokes; pos++) {
    third = settings.spokes / 3
    let x1, y1
    
    if (pos < third) {
      //First third goes along top right of triangle
      let xdist = tx2 - tx1
      let ydist = ty2 - ty1
    
      x1 = getTrianglePos(pos, third, tx1, xdist)
      y1 = getTrianglePos(pos, third, ty1, ydist)
      angle = -Math.PI / 6
    } else if (pos < 2 * third) {
      //Second third goes along bottom of triangle
      let xdist = tx2 - tx3
      let ydist = ty2 - ty3
      
      x1 = getTrianglePos(pos, third, tx3, xdist)
      y1 = getTrianglePos(pos, third, ty3, ydist)
      angle = Math.PI / 2
    } else {
      //Final third goes along top left of triangle
      let xdist = tx1 - tx3
      let ydist = ty1 - ty3
      
      x1 = getTrianglePos(pos, third, tx3, xdist)
      y1 = getTrianglePos(pos, third, ty3, ydist)
      angle = -5 * Math.PI / 6
    }
    drawSpoke(context, x1, y1, angle, maxSpokeLen, frequencies[pos])
  }
}


function drawSpoke(context, x1, y1, angle, maxSpokeLen, freq=255){
  context.strokeStyle = settings.fgColor
  let spokeLen = maxSpokeLen * (freq / 255)
  
  let x2 = x1 + spokeLen * Math.cos(angle)
  let y2 = y1 + spokeLen * Math.sin(angle)
  
  context.lineWidth = SPOKE_WIDTH;
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
}


function getTrianglePos(index, third, startVertex, edgeLen) {
    return startVertex + edgeLen * (index % third) / third
}
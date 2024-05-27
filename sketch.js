let words = [];
let currentInput = "";
let inputX, inputY;
let isTyping = false;
let cursorBlink = false;
let lastBlinkTime = 0;
let blinkInterval = 500; // milliseconds
let font;

// Replace 'your-glitch-project' with the name of your Glitch project
let socket = new WebSocket('wss://waiting-picayune-canid.glitch.me');

socket.onmessage = function(event) {
    let data = JSON.parse(event.data);
    if (data.type === 'newWord') {
        words.push(new DisintegratingWord(data.word, data.x, data.y));
    }
};



function preload() {
    font = loadFont('Arial.ttf'); // Make sure to have an Arial font in the assets folder
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Setup WebSocket connection
    socket = new WebSocket(`ws://${window.location.host}`);
    
    socket.onmessage = function(event) {
        let data = JSON.parse(event.data);
        if (data.type === 'newWord') {
            words.push(new DisintegratingWord(data.word, data.x, data.y));
        }
    };

    // Allow users to add words by clicking
    canvas.addEventListener('click', (event) => {
        inputX = event.clientX;
        inputY = event.clientY;
        currentInput = "";
        isTyping = true;
    });

    // Listen for keyboard events
    window.addEventListener('keydown', (event) => {
        if (isTyping) {
            if (event.key === 'Enter') {
                let newWord = { word: currentInput, x: inputX, y: inputY };
                words.push(new DisintegratingWord(currentInput, inputX, inputY));
                socket.send(JSON.stringify({ type: 'newWord', ...newWord }));
                isTyping = false;
            } else if (event.key === 'Backspace') {
                currentInput = currentInput.slice(0, -1);
            } else if (event.key.length === 1) {
                currentInput += event.key;
            }
        }
    });
}

function draw() {
    background(255);
    for (let i = words.length - 1; i >= 0; i--) {
        words[i].update();
        words[i].display();
        if (words[i].isDisintegrated()) {
            words.splice(i, 1);
        }
    }

    if (isTyping) {
        fill(0);
        textSize(32);
        text(currentInput, inputX, inputY);

        // Display text insertion cursor
        let textWidthSoFar = textWidth(currentInput);
        let cursorX = inputX + textWidthSoFar;

        // Blink logic
        if (millis() - lastBlinkTime > blinkInterval) {
            cursorBlink = !cursorBlink;
            lastBlinkTime = millis();
        }
        if (cursorBlink) {
            stroke(0);
            line(cursorX, inputY - textSize() * 0.75, cursorX, inputY + textSize() * 0.25); // Adjust vertical position based on text size
        }
    }

    // Display floating cursor
    fill(0);
    noStroke();
    ellipse(mouseX, mouseY, 5, 5); // Floating cursor as a small circle
}

class DisintegratingWord {
    constructor(word, x, y) {
        this.word = word;
        this.x = x;
        this.y = y;
        this.points = [];

        // Generate points to fill the text
        let bounds = font.textBounds(word, 0, 0, 32);
        for (let i = 0; i < bounds.w; i += 5) {  // Adjust step size for denser points
            for (let j = 0; j < bounds.h; j += 5) {  // Adjust step size for denser points
                let testPoint = createVector(i, j);
                if (font.contains(testPoint.x, testPoint.y, 32, word)) {
                    let pos = createVector(testPoint.x + x + bounds.x, testPoint.y + y + bounds.y);
                    let vel = p5.Vector.random2D().mult(random(0.5, 1.5));
                    this.points.push({ pos: pos, vel: vel });
                }
            }
        }

        this.disintegrateRate = 0.02; // Adjusted disintegration rate
        this.disintegration = 0;
        this.alpha = 255;
    }

    update() {
        this.disintegration += this.disintegrateRate;
        if (this.disintegration >= 1 && this.points.length > 0) {
            this.disintegration = 0;
            const randomIndex = floor(random(this.points.length));
            this.points.splice(randomIndex, 1); // Remove one point randomly
        }

        for (let point of this.points) {
            point.pos.add(point.vel);
        }

        this.alpha = map(this.points.length, 0, font.textToPoints(this.word, 0, 0, 32, {
            sampleFactor: 0.1
        }).length, 0, 255);
    }

    display() {
        fill(0, this.alpha);
        noStroke();
        for (let i = 0; i < this.points.length; i++) {
            let p = this.points[i].pos;
            rect(p.x, p.y, 4, 4); // Drawing rectangles instead of ellipses
        }
    }

    isDisintegrated() {
        return this.points.length === 0;
    }
}

let words = [];
let currentInput = "";
let inputX, inputY;
let isTyping = false;
let cursorBlink = false;
let lastBlinkTime = 0;
let blinkInterval = 500; // milliseconds
let font;

function preload() {
    font = loadFont('Arial.ttf'); // Make sure to have an Arial font in the assets folder
}

function setup() {
    noCursor();

    createCanvas(windowWidth, windowHeight);

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
                words.push(new DisintegratingWord(currentInput, inputX, inputY));
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
        textFont(font);
        textSize(64);
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
    fill(255,0,0);
    ellipse(mouseX, mouseY, 20, 20); // Floating cursor as a small circle
}

class DisintegratingWord {
    constructor(word, x, y) {
        this.word = word;
        this.x = x;
        this.y = y;
        this.points = font.textToPoints(word, 0, 0, 64, {
            sampleFactor: 0.8
        });
        this.points = this.points.map(p => {
            let pos = createVector(p.x + x, p.y + y);
            let vel = p5.Vector.random2D().mult(random(0.0005, 0.005));
            return { pos: pos, vel: vel };
        });
        this.disintegrateRate = 0.1; // Adjusted disintegration rate
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
        
        this.alpha = map(this.points.length, 0, font.textToPoints(this.word, 0, 0, 64, {
            sampleFactor: 0.1
        }).length, 0, 255);
    }

    display() {
        fill(0, this.alpha);
        noStroke();
        for (let i = 0; i < this.points.length; i++) {
            let p = this.points[i].pos;
            rect(p.x, p.y, 7, 7);
        }
    }

    isDisintegrated() {
        return this.points.length === 0;
    }
}

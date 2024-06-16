let words = [];
let allPixels = [];
let vines = [];
let currentInput = "";
let inputX, inputY;
let isTyping = false;
let cursorBlink = false;
let lastBlinkTime = 0;
let blinkInterval = 500; // milliseconds

let fonts = [];
let fontNames = ['Old']; // Add more fonts if needed

let disintegrationColors = [
    { r: 0, g: 0, b: 255 }, // Blue
    { r: 255, g: 165, b: 0 }, // Orange
    { r: 128, g: 128, b: 128 }, // Grey
    { r: 0, g: 128, b: 0 } // Green
];

let grid = [];
let cellSize = 10;
let maxVines = 500; // Maximum number of vines allowed
let toolbarWidth = 300;

function preload() {
    // Load fonts from assets directory
    for (let fontName of fontNames) {
        fonts.push(loadFont(`${fontName}.ttf`)); // Ensure these fonts are available in the assets folder
    }
}

function setup() {
    let canvas = createCanvas(windowWidth*0.8, windowHeight*0.85);
    canvas.parent('canvas-container');
    createGrid();

    // Allow users to add words by clicking
    canvas.elt.addEventListener('click', (event) => {
        inputX = event.clientX;
        inputY = event.clientY;
        currentInput = "";
        isTyping = true;
    });

    // Listen for keyboard events
    window.addEventListener('keydown', (event) => {
        if (isTyping) {
            if (event.key === 'Enter') {
                let randomFont = random(fonts);
                let randomFontSize = random(64, 72);
                let newWord = new PixelizedWord(currentInput, inputX, inputY, randomFont, randomFontSize);
                words.push(newWord);
                addPixelsToGrid(newWord.pixels);
                allPixels = allPixels.concat(newWord.pixels);
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
    clear(); // Clear the canvas every frame to prevent cache buildup
    background(192);

    for (let word of words) {
        word.update();
    }

    updatePixelsGlobal();

    if (isTyping) {
        fill(0);
        textFont(fonts[0]); // Use the first font as default for typing input
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


    // Grow vines
    growVines();
    updateVines();
}

function createGrid() {
    let cols = ceil((width - toolbarWidth) / cellSize);
    let rows = ceil(height / cellSize);
    for (let i = 0; i < cols; i++) {
        grid[i] = [];
        for (let j = 0; j < rows; j++) {
            grid[i][j] = [];
        }
    }
}

function addPixelsToGrid(pixels) {
    for (let pixel of pixels) {
        let col = floor(pixel.x / cellSize);
        let row = floor(pixel.y / cellSize);
        if (col >= 0 && col < grid.length && row >= 0 && row < grid[0].length) {
            grid[col][row].push(pixel);
        }
    }
}

function updatePixelsGlobal() {
    for (let pixel of allPixels) {
        if (pixel.falling) {
            pixel.y += pixel.size * 0.7; // Fall speed

            // Stop falling when reaching the bottom or colliding with another pixel
            if (pixel.y >= height - pixel.size || isCollidingGlobal(pixel)) {
                pixel.y = min(pixel.y, height - pixel.size);
                pixel.falling = false;

                // Check for vine growth conditions
                checkForVineGrowth(pixel);
            }
        }
    }

    beginShape(QUADS);
    for (let pixel of allPixels) {
        fill(pixel.r, pixel.g, pixel.b, pixel.a);
        noStroke();
        vertex(pixel.x, pixel.y);
        vertex(pixel.x + pixel.size, pixel.y);
        vertex(pixel.x + pixel.size, pixel.y + pixel.size);
        vertex(pixel.x, pixel.y + pixel.size);
    }
    endShape();
}

function isCollidingGlobal(pixel) {
    let col = floor(pixel.x / cellSize);
    let row = floor(pixel.y / cellSize);
    let neighbors = [];

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let newCol = col + i;
            let newRow = row + j;
            if (newCol >= 0 && newCol < grid.length && newRow >= 0 && newRow < grid[0].length) {
                neighbors = neighbors.concat(grid[newCol][newRow]);
            }
        }
    }

    for (let other of neighbors) {
        if (other !== pixel && !other.falling && dist(pixel.x, pixel.y, other.x, other.y) < pixel.size) {
            return true;
        }
    }
    return false;
}

function checkForVineGrowth(pixel) {
    for (let other of allPixels) {
        if (other !== pixel && !other.falling && dist(pixel.x, pixel.y, other.x, other.y) < pixel.size) {
            // Grow a vine from this location
            if (pixel.y >= height - pixel.size && vines.length < maxVines) {
                vines.push(new Vine(pixel.x, pixel.y));
            }
            return;
        }
    }
}

function growVines() {
    for (let vine of vines) {
        vine.grow();
    }
}

function updateVines() {
    for (let i = vines.length - 1; i >= 0; i--) {
        let vine = vines[i];
        if (vine.isComplete()) {
            vines.splice(i, 1); // Remove completed vines
        } else {
            vine.display();
        }
    }
}

class Vine {
    constructor(x, y) {
        this.pixels = [{ x: x, y: y }];
        this.growthRate = 20; // Number of frames before each new pixel is added
        this.frameCounter = 0;
        this.pixelSize = 2;
        this.noiseOffset = random(1000);
        this.maxBranches = 3; // Limit the number of branches
        this.branchCount = 0;
        this.maxLength = 200; // Maximum length of the vine
        this.stoppedGrowing = false;
    }

    grow() {
        if (this.stoppedGrowing) return;

        this.frameCounter++;
        this.age++;

        // Turn brown over time
        if (this.age > 200) {
            this.pixels.forEach(pixel => {
                pixel.r = 139; // Brown color
                pixel.g = 69;
                pixel.b = 19;
            });
        }

        // Drop pixels if too old
        if (this.age > 300) {
            this.pixels = this.pixels.filter(pixel => {
                if (random() < 0.01) {
                    pixel.falling = true;
                    allPixels.push(pixel); // Add to global falling pixels
                    return false;
                }
                return true;
            });
        }

        if (this.frameCounter % this.growthRate === 0 && this.pixels.length < this.maxLength) {
            let lastPixel = this.pixels[this.pixels.length - 1];
            let angle = noise(this.noiseOffset + this.frameCounter * 0.1) * TWO_PI;
            let newPixelX = lastPixel.x + cos(angle) * this.pixelSize;
            let newPixelY = lastPixel.y - sin(angle) * this.pixelSize;

            if (!isCollidingGlobal({ x: newPixelX, y: newPixelY, size: this.pixelSize }) &&
                newPixelX >= 0 && newPixelX < width - toolbarWidth &&
                newPixelY >= 0 && newPixelY < height) {
                this.pixels.push({ x: newPixelX, y: newPixelY, r: 0, g: 128, b: 0, a: 255, size: this.pixelSize });

                // Add the new pixel to the grid
                let col = floor(newPixelX / cellSize);
                let row = floor(newPixelY / cellSize);
                if (col >= 0 && col < grid.length && row >= 0 && row < grid[0].length) {
                    grid[col][row].push({ x: newPixelX, y: newPixelY, r: 0, g: 128, b: 0, a: 255, size: this.pixelSize });
                }

                // Randomly create branches with a limit
                if (random() < 0.05 && this.branchCount < this.maxBranches) {
                    let branch = new Vine(newPixelX, newPixelY);
                    branch.frameCounter = this.frameCounter; // Synchronize branch growth with parent vine
                    vines.push(branch);
                    this.branchCount++;
                }

                // Bloom flowers randomly
                if (random() < this.bloomRate) {
                    this.pixels.push({ x: newPixelX, y: newPixelY, r: 255, g: 182, b: 193, a: 255, size: this.pixelSize }); // Pink flower
                }
            }
        }

        if (vines.length >= maxVines) {
            this.stoppedGrowing = true;
        }
    }

    display() {
        noStroke();
        beginShape(QUADS);
        for (let pixel of this.pixels) {
            fill(pixel.r, pixel.g, pixel.b, pixel.a);
            vertex(pixel.x, pixel.y);
            vertex(pixel.x + pixel.size, pixel.y);
            vertex(pixel.x + pixel.size, pixel.y + pixel.size);
            vertex(pixel.x, pixel.y + pixel.size);
        }
        endShape();
    }

    isComplete() {
        return this.pixels.length >= this.maxLength;
    }
}

class PixelizedWord {
    constructor(word, x, y, font, fontSize) {
        this.word = word;
        this.x = x;
        this.y = y;
        this.font = font;
        this.fontSize = fontSize;
        this.pixels = [];
        this.pixelSize = 2; // Size of each blocky pixel
        this.createPixelArray();
        this.disappearRate = 0.1; // Adjust the rate of disappearance
        this.disappearance = 0;
    }

    createPixelArray() {
        let pg = createGraphics(width, height);
        pg.pixelDensity(1);
        pg.textFont(this.font);
        pg.textSize(this.fontSize);
        pg.fill(0);
        pg.text(this.word, this.x, this.y);
        pg.loadPixels();

        for (let y = 0; y < pg.height; y += this.pixelSize) {
            for (let x = 0; x < pg.width; x += this.pixelSize) {
                let index = (x + y * pg.width) * 4;
                let r = pg.pixels[index];
                let g = pg.pixels[index + 1];
                let b = pg.pixels[index + 2];
                let a = pg.pixels[index + 3];
                // Only include solid black pixels
                if (a > 128 && r < 128 && g < 128 && b < 128) {
                    let color = { x: x, y: y, r: 0, g: 0, b: 0, a: 255, size: this.pixelSize, falling: false, name: 'black' };
                    this.pixels.push(color);
                }
            }
        }
    }

    update() {
        this.disappearance += this.disappearRate;
        if (this.disappearance >= 1 && this.pixels.length > 0) {
            this.disappearance = 0;
            const randomIndex = floor(random(this.pixels.length));
            this.pixels[randomIndex].falling = true; // Set one pixel to start falling
            let colorIndex = randomIndex % disintegrationColors.length;
            this.pixels[randomIndex].r = disintegrationColors[colorIndex].r;
            this.pixels[randomIndex].g = disintegrationColors[colorIndex].g;
            this.pixels[randomIndex].b = disintegrationColors[colorIndex].b;
            this.pixels[randomIndex].name = disintegrationColors[colorIndex].name;
        }
    }
}

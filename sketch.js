let pieceCount = 7; // number of pieces in each row and column for the side panels
let pieces = []; // array to store the pieces
let sourceImage; // the source image or video
let sourceIsVideo = false; // whether the source is a video
let pieceSize;       // pixel size of one piece on the board
let puzzleLeft;      // x position of board left 
let puzzleTop;       // y position of board top 
let sidePanelWidth;  // width of each side panel 
let trayTileSize;    // drawn size of pieces in the panels
let imageScale;      // scale for source image per piece
let draggedPiece = null; // the piece that is being dragged
let draggedGroup = null; // the group of pieces that are being dragged
let dragOffsets = []; // offsets for each piece in dragged group
let showPreview = false; // whether to show the preview image

// ──────── LOAD IMAGES ────────
function preload() {
  let params = new URLSearchParams(window.location.search);
  let imageParam = params.get('img') || 'default';
  if (imageParam.match(/\.(mp4)$/i)) {
    sourceIsVideo = true;
  } else if (imageParam.match(/\.(jpg|jpeg|png|)$/i)) {
    sourceImage = loadImage(imageParam);
  } else {
    let url = imageParam.startsWith('http')
      ? imageParam
      : `https://picsum.photos/seed/${imageParam}/600/600`;
    sourceImage = loadImage(url);
  }
}

// ──────── SETUP ────────
function setup() {
  createCanvas(windowWidth, windowHeight);

  // Returns back to home page
  let homeButton = createButton('Home');
  homeButton.position(10, 10);
  homeButton.mousePressed(() => window.location.href = '/PWC_final/');
  homeButton.style('font-size', '16px');
  homeButton.style('padding', '10px 20px');

  // Toggles the preview image
  let previewButton = createButton('Toggle Preview');
  previewButton.position(120, 10);
  previewButton.mousePressed(() => showPreview = !showPreview);
  previewButton.style('font-size', '16px');
  previewButton.style('padding', '10px 20px');

  // Resets the puzzle
  let resetButton = createButton('Reset');
  resetButton.position(320, 10);
  resetButton.mousePressed(resetPuzzle);
  resetButton.style('font-size', '16px');
  resetButton.style('padding', '10px 20px');

  // Solves the puzzle
  let solveButton = createButton('Solve');
  solveButton.position(430, 10);
  solveButton.mousePressed(solvePuzzle);
  solveButton.style('font-size', '16px');
  solveButton.style('padding', '10px 20px');

  // If the source is a video, create a video object
  if (sourceIsVideo) {
    let videoPath = new URLSearchParams(window.location.search).get('img');
    sourceImage = createVideo(videoPath, () => {
      sourceImage.hide();
      sourceImage.loop();
      sourceImage.volume(0);
      buildPuzzle();
    });
  } else {
    // otherwise, build the puzzle
    buildPuzzle();
  }
}

// ──────── BUILD THE PUZZLE ────────
function buildPuzzle() {
  let sourceWidth  = sourceIsVideo ? sourceImage.elt.videoWidth  : sourceImage.width;
  let sourceHeight = sourceIsVideo ? sourceImage.elt.videoHeight : sourceImage.height;
  let squareSize   = min(sourceWidth, sourceHeight); // crop the image to a square

  // calculate the size of the board and the side panels
  let boardSize  = min(width * 0.55, height * 0.9) * 0.95;
  sidePanelWidth = (width - boardSize) / 2;
  puzzleLeft = sidePanelWidth; // x position of board left 
  puzzleTop = (height - boardSize) / 2; // y position of board top 
  pieceSize = boardSize / pieceCount; // pixel size of one piece on the board
  trayTileSize = min(sidePanelWidth * 0.42, pieceSize * 0.9); // drawn size of pieces in the panels
  imageScale = pieceSize / (squareSize / pieceCount); // scale for source image per piece

  pieces = []; // empty array to store the pieces
  let grid = []; // empty array to store the grid
  // create the pieces
  for (let row = 0; row < pieceCount; row++) {
    grid[row] = []; // create a new row
    for (let col = 0; col < pieceCount; col++) {
      let piece = { // create a new piece
        row, col,
        // saves the correct position of the piece on the board
        correctX: puzzleLeft + col * pieceSize + pieceSize / 2, // correct x position of the piece
        correctY: puzzleTop  + row * pieceSize + pieceSize / 2, // correct y position of the piece
        x: 0, y: 0,
        // saves the position of the piece when sitting in the side panels
        panelX: 0, panelY: 0, // position when sitting in side panel
        edges: [
          row === 0 ? 0 : -grid[row-1][col].edges[2], // edge type for the top piece
          col === pieceCount-1 ? 0 : random([-1, 1]), // edge type for the right piece
          row === pieceCount-1 ? 0 : random([-1, 1]), // edge type for the bottom piece
          col === 0 ? 0 : -grid[row][col-1].edges[1], // edge type for the left piece
        ],
        inPanel: true, // whether the piece is in a panel
        locked: false, // whether the piece is locked in place
        group: null, // group of pieces that are connected
      };
      grid[row][col] = piece;
      pieces.push(piece); // add the piece to the pieces array
    }
  }

  for (let piece of pieces) piece.group = [piece]; // each piece starts in its own group

  // shuffle order of pieces so panels look random
  for (let i = pieces.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  arrangeSidePanels(); // arrange the pieces in the side panels
}

// ──────── LAYOUT ────────
// Arranges the pieces in the side panels
function arrangeSidePanels() {
  let gap = 20;
  let topOffset = 80; // leave room for buttons at top
  let cols = max(1, floor((sidePanelWidth - gap) / (trayTileSize + gap)));
  let leftCount = 0; // number of pieces in the left panel
  let leftIndex = 0; // index of the left panel
  let rightIndex = 0; // index of the right panel
  let panelCounter = 0; // counter for the number of pieces in the panels

  for (let piece of pieces) if (piece.inPanel) leftCount++;
  leftCount = ceil(leftCount / 2);

  // arrange the pieces in the side panels
  for (let piece of pieces) {
    if (!piece.inPanel) continue; // if the piece is not in a panel, skip it
    if (panelCounter < leftCount) {
      piece.panelX = gap + (leftIndex % cols) * (trayTileSize + gap) + trayTileSize / 2; // x position of the piece in the left panel
      piece.panelY = topOffset + gap + floor(leftIndex / cols) * (trayTileSize + gap) + trayTileSize / 2; // y position of the piece in the left panel
      leftIndex++; 
    } else {
      piece.panelX = puzzleLeft + pieceSize * pieceCount + gap + (rightIndex % cols) * (trayTileSize + gap) + trayTileSize / 2; // x position of the piece in the right panel
      piece.panelY = topOffset + gap + floor(rightIndex / cols) * (trayTileSize + gap) + trayTileSize / 2; // y position of the piece in the right panel
      rightIndex++; 
    }
    piece.x = piece.panelX; // x position of the piece∂
    piece.y = piece.panelY; // y position of the piece
    panelCounter++; 
  }
}

// ──────── RESET / SOLVE ────────

// Resets the puzzle
function resetPuzzle() {
  draggedPiece = null; draggedGroup = null; dragOffsets = [];
  for (let piece of pieces) {
    piece.inPanel = true; // if the piece is in a panel, it is in the side panels
    piece.locked = false; // if the piece is locked, it cannot be moved
    piece.group = [piece]; // group of pieces that are connected
  }
  // reshuffle the pieces
  for (let i = pieces.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  arrangeSidePanels(); // arrange the pieces in the side panels
}

// Solves the puzzle (for demo)
function solvePuzzle() {
  draggedPiece = null; draggedGroup = null; dragOffsets = [];
  let solvedGroup = [];
  for (let piece of pieces) {
    piece.x = piece.correctX;
    piece.y = piece.correctY;
    piece.inPanel = false;
    piece.locked = true;
    piece.group = solvedGroup;
    solvedGroup.push(piece);
  }
  arrangeSidePanels();
}

// ──────── SNAPPING ────────
// Joins two groups of pieces together
function joinGroups(targetGroup, movingGroup, shiftX, shiftY) {
  for (let piece of movingGroup) {
    piece.x += shiftX;
    piece.y += shiftY;
    piece.group = targetGroup;
    targetGroup.push(piece);
  }
}

function trySnapGroup(group) {
  let snapDistance = pieceSize * 0.35;

  let directions = [ // directions to check for snapping (row, col, correct offset x, correct offset y)
    [-1, 0, 0, -pieceSize],  // above
    [ 1, 0, 0, pieceSize],  // below
    [ 0, -1, -pieceSize, 0 ],  // left
    [ 0, 1, pieceSize, 0 ],  // right
  ];

  // try snapping to an adjacent placed piece (neighbor-based snap)
  for (let piece of group) {
    for (let [rowStep, colStep, correctOffsetX, correctOffsetY] of directions) { // check each direction
      let neighborRow = piece.row + rowStep; // calculate the row of the neighbor
      let neighborCol = piece.col + colStep; // calculate the column of the neighbor
      if (neighborRow < 0 || neighborRow >= pieceCount) continue; // if the neighbor is out of bounds, skip it
      if (neighborCol < 0 || neighborCol >= pieceCount) continue; // if the neighbor is out of bounds, skip it

      let neighbor = null; // initialize the neighbor piece
      for (let candidate of pieces) { // check each piece
        if (candidate.row === neighborRow && candidate.col === neighborCol) { // if a match is found
          neighbor = candidate; 
          break; // set the neighbor to the candidate 
        }
      }
      if (!neighbor || neighbor.group === group || neighbor.inPanel) continue; // if the neighbor is not found, skip it

      // calculate the error in the x and y directions used for threshold
      let errorX = piece.x - (neighbor.x + correctOffsetX); // calculate the error in the x direction
      let errorY = piece.y - (neighbor.y + correctOffsetY); // calculate the error in the y direction
      if (sqrt(errorX*errorX + errorY*errorY) < snapDistance) {
        let saveGroup = neighbor.group.slice();
        let movingGroup = group.slice();
        joinGroups(neighbor.group, group, -errorX, -errorY); // join the groups
        for (let groupPiece of saveGroup) {
          let distX = groupPiece.x - groupPiece.correctX; // calculate the distance in the x direction
          let distY = groupPiece.y - groupPiece.correctY; // calculate the distance in the y direction
          if (distX*distX + distY*distY < 1) groupPiece.locked = true; // if the distance is less than 1, lock the piece in place
        }
        for (let groupPiece of movingGroup) {
          let distX = groupPiece.x - groupPiece.correctX; // calculate the distance in the x direction
          let distY = groupPiece.y - groupPiece.correctY; // calculate the distance in the y direction
          if (distX*distX + distY*distY < 1) groupPiece.locked = true; // if the distance is less than 1, lock the piece in place
        }
        return; // if the piece is snapped in place
      }
    }
  }

  // try snapping to correct board position (location-based)
  for (let piece of group) {
    let distX = piece.x - piece.correctX; // calculate the distance in the x direction
    let distY = piece.y - piece.correctY; // calculate the distance in the y direction
    if (sqrt(distX*distX + distY*distY) < snapDistance) {
      // move the pieces to the correct position
      for (let groupPiece of group) {
        groupPiece.x -= distX; // move the piece in the x direction
        groupPiece.y -= distY; // move the piece in the y direction
        let ex = groupPiece.x - groupPiece.correctX; // calculate the error in the x direction
        let ey = groupPiece.y - groupPiece.correctY; // calculate the error in the y direction
        if (ex*ex + ey*ey < 1) groupPiece.locked = true; // if the error is less than 1, lock the piece in place
      }
      return; // if the piece is snapped in place
    }
  }
}

// ──────── DRAW ────────
// Draws the puzzle
function draw() {
  background(200);

  noFill(); stroke(0); strokeWeight(4); // draw the board
  rect(puzzleLeft, puzzleTop, pieceSize * pieceCount, pieceSize * pieceCount);

  for (let piece of pieces) if (!piece.inPanel && piece !== draggedPiece) drawPiece(piece); // draw the pieces in the board
  for (let piece of pieces) if (piece.inPanel  && piece !== draggedPiece) drawPiece(piece); // draw the pieces on the side panels
  if (draggedGroup) for (let piece of draggedGroup) drawPiece(piece); // draw the dragged group

  if (showPreview) { // draw the preview image
    let previewSize = pieceSize * pieceCount * 0.7;
    let previewX = puzzleLeft + (pieceSize * pieceCount - previewSize) / 2;
    let previewY = puzzleTop - previewSize - 10;
    image(sourceImage, previewX, previewY, previewSize, previewSize); // draw the preview image
    noFill(); stroke(0); strokeWeight(2); // draw the preview image border
    rect(previewX, previewY, previewSize, previewSize);
  }
}

// Draws a piece
function drawPiece(piece) {
  let scale = piece.inPanel ? trayTileSize / pieceSize : 1; // scale for the piece
  let drawnSize = pieceSize * scale; // drawn size of the piece
  let outline = getPieceOutline(piece, drawnSize); // outline of the piece

  push();
  translate(piece.x, piece.y);

  let ctx = drawingContext; // get the drawing context
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
  ctx.closePath();
  ctx.clip();

  let sourceWidth = sourceIsVideo ? sourceImage.elt.videoWidth  : sourceImage.width;
  let sourceHeight = sourceIsVideo ? sourceImage.elt.videoHeight : sourceImage.height;
  let squareSize = min(sourceWidth, sourceHeight);
  let sourceTileSize = squareSize / pieceCount; // size of one piece on the source image
  let drawScale = imageScale * scale; // scale for the source image
  let cropOffsetX = (sourceWidth  - squareSize) / 2; // offset for the crop
  let cropOffsetY = (sourceHeight - squareSize) / 2; // offset for the crop

  imageMode(CORNER);
  image(sourceImage,
    -((piece.col + 0.5) * sourceTileSize + cropOffsetX) * drawScale,
    -((piece.row + 0.5) * sourceTileSize + cropOffsetY) * drawScale, // y position of the piece on the source image
    sourceWidth  * drawScale, // width of the source image
    sourceHeight * drawScale // height of the source image
  );
  // restore the drawing context
  ctx.restore();

  stroke(0); // draw the edges of the piece
  strokeWeight(max(1, 2 * scale)); 
  noFill(); 
  for (let side = 0; side < 4; side++) {
    if (piece.edges[side] === 0) continue;
    let half = drawnSize / 2; // half the size of the piece
    let tabOut = drawnSize * 0.35; // outer tab reach
    let tabIn = piece.edges[side] * drawnSize * 0.2;
    push(); 
    rotate(side * HALF_PI); // rotate the piece
    beginShape();
    curveVertex(-half, -half);
    curveVertex(-half, -half); // start point
    curveVertex(-half + tabOut, -half); // outer tab reach
    curveVertex(-half + tabOut, -half + tabIn); // outer tab depth
    curveVertex( half - tabOut, -half + tabIn); // inner tab depth
    curveVertex( half - tabOut, -half); // inner tab reach
    curveVertex( half, -half); // end point
    curveVertex( half, -half); 
    endShape();
    pop(); // pop the drawing context
  }
  pop();
}

// ──────── GEOMETRY ────────

// Gets the outline of a piece
function getPieceOutline(piece, drawnSize) {
  let vertices = [];
  for (let side = 0; side < 4; side++) {
    let edgePoints = getEdgePoints(drawnSize, piece.edges[side]);
    let startIndex = side === 0 ? 0 : 1;
    for (let i = startIndex; i < edgePoints.length; i++) {
      let point = edgePoints[i];
      let angle = side * HALF_PI;
      let rotatedX = point.x * cos(angle) - point.y * sin(angle); // rotate the point
      let rotatedY = point.x * sin(angle) + point.y * cos(angle);
      vertices.push({ x: rotatedX, y: rotatedY }); // add the rotated point to the vertices
    }
  }
  return vertices;
}

// Gets the edge points for a piece
function getEdgePoints(size, edgeType) {
  let half = size / 2;
  if (edgeType === 0) return [createVector(-half, -half), createVector(half, -half)];

  let tabReach = size * 0.35; // outer tab reach
  let tabDepth = edgeType * size * 0.2; // outer tab depth
  let controlPoints = [
    createVector(-half, -half), // start point
    createVector(-half + tabReach, -half), // outer tab reach
    createVector(-half + tabReach, -half + tabDepth), // outer tab depth   
    createVector( half - tabReach, -half + tabDepth), // inner tab depth
    createVector( half - tabReach, -half),
    createVector( half, -half), // end point
  ];
  
  let points = [];
  let stepsPerSegment = 10;
  for (let i = 0; i < controlPoints.length - 1; i++)
    for (let step = 0; step < stepsPerSegment; step++) {
        let t = step / stepsPerSegment;
        let x = controlPoints[i].x * (1 - t) + controlPoints[i+1].x * t;
        let y = controlPoints[i].y * (1 - t) + controlPoints[i+1].y * t;
        points.push(createVector(x, y));
    }
  points.push(controlPoints[controlPoints.length - 1].copy());
  return points;
}

// ──────── MOUSE EVENTS ────────
// Handles mouse pressed events
function mousePressed() {
  let mouseInPanel = mouseX < sidePanelWidth || mouseX > puzzleLeft + pieceSize * pieceCount;
  for (let i = pieces.length - 1; i >= 0; i--) {
    let piece = pieces[i];
    if (piece.locked) continue; // if the piece is locked, skip it
    if (piece.inPanel && !mouseInPanel) continue;
    if (!piece.inPanel && mouseInPanel) continue; // if the piece is not in a panel and the mouse is in a panel, skip it

    // check if the mouse is over the piece
    let clickRadius = piece.inPanel ? trayTileSize / 2 : pieceSize / 2; // radius of the click area
    if (abs(mouseX - piece.x) < clickRadius && abs(mouseY - piece.y) < clickRadius) {
      draggedPiece = piece; // set the dragged piece to the piece
      draggedGroup = piece.group.slice(); // set the dragged group to the group of the piece
      dragOffsets  = []; // clear the drag offsets
      for (let groupPiece of draggedGroup) {
        dragOffsets.push({
          piece: groupPiece, // set the piece to the group piece
          offsetX: mouseX - groupPiece.x, // offset in the x direction
          offsetY: mouseY - groupPiece.y, // offset in the y direction
        });
        groupPiece.inPanel = false; // set the piece to the board instead of panel
      }
      return;
    }
  }
}

// Handles mouse dragged events
function mouseDragged() {
  if (!draggedGroup) return;
  for (let { piece, offsetX, offsetY } of dragOffsets) {
    piece.x = mouseX - offsetX; // move the piece in the x direction
    piece.y = mouseY - offsetY; // move the piece in the y direction
  }
}

// Handles mouse released events
function mouseReleased() {
  if (!draggedPiece) return; // if the dragged group is not found, skip it
  let releasedInPanel = mouseX < sidePanelWidth || mouseX > puzzleLeft + pieceSize * pieceCount;
  if (releasedInPanel && draggedPiece.group.length === 1) {
    draggedPiece.inPanel = true; // set the piece to the panel
  } else {
    trySnapGroup(draggedPiece.group); // try to snap the group
  }
  arrangeSidePanels(); // arrange the pieces in the side panels
  draggedPiece = null; draggedGroup = null; dragOffsets = [];
}

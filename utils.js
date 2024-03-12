function showInitialGraph() {
    for (let face of faces) {
        fill(200);
        face.draw();
    }
    for (let face of mergedFaces) {
        fill(0, 255, 255);
        face.draw();
    }

    for (let i = 0; i < vertices.length; i++) {
        stroke(0);
        if (vertices[i].edgy) {
            stroke(255, 255, 0);
        }
        circle(vertices[i].x, vertices[i].y, 6);
        noStroke();
        text(i, vertices[i].x, vertices[i].y + 20);
    }

    for (let vertex of subdivVertices) {
        stroke(255, 0, 0);
        if (vertex.edgy) {
            stroke(255, 255, 0);
        }
        circle(vertex.x, vertex.y, 4);
    }
    for (let vertex of faceCenterVertices) {
        stroke(0, 255, 0);
        circle(vertex.x, vertex.y, 4);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

function getVertexIndex(i, j, k) {
    if (i === 0) return 0; // Central point
    return 1 + (i * 6 * (i - 1)) / 2 + j * i + k;
}

// Function to create or retrieve a vertex at an edge midpoint
function getOrCreateEdgeMidpoint(v1, v2) {
    let edgeKey = `${Math.min(v1.index, v2.index)}-${Math.max(
        v1.index,
        v2.index
    )}`;
    if (edgeMidpointMap.has(edgeKey)) {
        return edgeMidpointMap.get(edgeKey);
    } else {
        let midpoint = new SubdivVertex((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
        if (v1.edgy && v2.edgy) {
            midpoint.edgy = true;
        }
        subdivVertices.push(midpoint);
        edgeMidpointMap.set(edgeKey, midpoint);
        return midpoint;
    }
}

// Function to create a vertex at the center of a face
function createFaceCenter(vertices) {
    let centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    let centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    let centerVertex = new SubdivVertex(centerX, centerY);
    faceCenterVertices.push(centerVertex);
    subdivVertices.push(centerVertex);
    return centerVertex;
}

function subdivideMesh() {
    let newFaces = []; // Store new subdivided faces here

    faces.forEach((face) => {
        // Compute edge midpoints
        let midpoints = [];
        for (let i = 0; i < face.vertices.length; i++) {
            let v1 = face.vertices[i];
            let v2 = face.vertices[(i + 1) % face.vertices.length];
            midpoints.push(getOrCreateEdgeMidpoint(v1, v2));
        }

        // Compute face center
        let centerVertex = createFaceCenter(face.vertices);

        // Form new quads for each segment of the original face
        for (let i = 0; i < face.vertices.length; i++) {
            let newQuadVertices = [
                face.vertices[i],
                midpoints[i],
                centerVertex,
                midpoints[(i - 1 + midpoints.length) % midpoints.length],
            ];
            newFaces.push(new Face(newQuadVertices));
        }
    });

    faces = newFaces; // Replace old faces with the new subdivided faces
}

function calculateFaceArea(face) {
    let area = 0;
    for (let i = 0; i < face.vertices.length; i++) {
        let v1 = face.vertices[i];
        let v2 = face.vertices[(i + 1) % face.vertices.length];
        area += v1.x * v2.y - v2.x * v1.y;
    }
    face.area = Math.abs(area / 2);
    return Math.abs(area / 2);
}

function calculateAverageArea(faces) {
    let totalArea = 0;
    faces.forEach((face) => {
        totalArea += calculateFaceArea(face);
    });
    return totalArea / faces.length;
}

function calculateFaceCentroid(face) {
    let centroidX = 0;
    let centroidY = 0;
    for (let i = 0; i < face.vertices.length; i++) {
        let v1 = face.vertices[i];
        let v2 = face.vertices[(i + 1) % face.vertices.length];
        let crossProduct = v1.x * v2.y - v2.x * v1.y;
        centroidX += (v1.x + v2.x) * crossProduct;
        centroidY += (v1.y + v2.y) * crossProduct;
    }
    let area = calculateFaceArea(face);
    return new SubdivVertex(centroidX / (6 * area), centroidY / (6 * area));
}

// Assuming calculateVertexCentroid returns the centroid of all faces adjacent to this vertex
function calculateVertexCentroid(vertex, faces) {
    let centroidX = 0;
    let centroidY = 0;
    for (let face of faces) {
        let area = calculateFaceArea(face);
        centroidX += face.centroid.x * area;
        centroidY += face.centroid.y * area;
    }
    let totalArea = faces.reduce(
        (sum, face) => sum + calculateFaceArea(face),
        0
    );
    return new SubdivVertex(centroidX / totalArea, centroidY / totalArea);
}

// Example of shuffling faces array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Use this function to shuffle faces at the start of each relaxation iteration

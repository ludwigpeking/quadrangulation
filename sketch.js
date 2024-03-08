const hexGridDiameter = 100;
const hexRingCount = 4;
let vertices = [];
let edges = [];
let faces = [];
let mergedFaces = [];
let subdivVertices = []; // To store new vertices
let edgeMidpointMap = new Map(); // Map to store and retrieve edge midpoints by edge key
let faceCenterVertices = []; // To store center vertices of faces
let averageEdgeLength = 0; // To store the average edge length of the mesh

class Vertex {
    constructor(i, j, k) {
        //i: hexagon ring count : 1 ~ hexRingCount
        //j: hexagon sector count: 0 ~ 5
        //k: index in a hexagon sector: 0 ~ (i-1)
        this.i = i;
        this.j = j;
        this.k = k;
        if (i + j + k === 0) {
            this.index = 0;
        } else {
            this.index = 1 + (i * 6 * (i - 1)) / 2 + j * i + k;
        }
        this.edgy = false;
        if (i === hexRingCount) {
            this.edgy = true;
        }

        this.p1 = { x: 0, y: 0 };
        this.p2 = { x: 0, y: 0 };
        this.p1.x = width / 2 + i * hexGridDiameter * cos((j * PI) / 3);
        this.p1.y = height / 2 + i * hexGridDiameter * sin((j * PI) / 3);
        this.p2.x = width / 2 + i * hexGridDiameter * cos(((j + 1) * PI) / 3);
        this.p2.y = height / 2 + i * hexGridDiameter * sin(((j + 1) * PI) / 3);
        //lerp between p1 and p2 by k, k is between 0 and i
        if (i == 0) {
            this.x = this.p1.x;
            this.y = this.p1.y;
        } else {
            this.x = lerp(this.p1.x, this.p2.x, k / i);
            this.y = lerp(this.p1.y, this.p2.y, k / i);
        }
    }
    draw() {
        ellipse(this.x, this.y, 2, 2);
        textSize(12);
        fill(255, 0, 0);
        text(
            "(" + this.i + "," + this.j + "," + this.k + ")",
            this.x + 2,
            this.y
        );
        text(this.index, this.x + 2, this.y + 10);
    }
}

class SubdivVertex {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Edge {
    constructor(v1, v2) {
        this.v1 = v1;
        this.v2 = v2;
    }
    draw() {
        line(this.v1.x, this.v1.y, this.v2.x, this.v2.y);
    }
}

class Face {
    constructor(vertices) {
        this.vertices = vertices;
    }
    draw() {
        beginShape();
        for (let v of this.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);
    }
}

function setup() {
    createCanvas(800, 800);
    background(220);
    const centralPoint = new Vertex(0, 0, 0);
    vertices.push(centralPoint);
    //i: hexagon ring count
    //j: hexagon sector count
    //k: index in a hexagon sector

    for (let i = 1; i <= hexRingCount; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < i; k++) {
                //lerp between p1 and p2
                const p = new Vertex(i, j, k);
                vertices.push(p);
                fill(255, 255, 0);
                // text(vertices.length - 1, p.x + 2, p.y + 20);
                // const edge1 = new Edge(p1, p3);
                // edges.push(edge1);
            }
        }
    }
    createFaces();
    mergeTrianglesToQuadsRandomly();
    subdivideMesh();
    // relaxVertices(1000);
    for (let face of faces) {
        fill(200);
        face.draw();
    }
    for (let face of mergedFaces) {
        fill(0, 255, 255);
        face.draw();
    }
    // for (let vertex of vertices) {
    //     vertex.draw();
    // }
    // for (let edge of edges) {
    //     edge.draw();
    // }
    // all vertices including the vertices, middle points of edges and center of faces, display them all

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
    precalculateAdjacentFaces();
    averageEdgeLength = calculateAverageEdgeLength();
    console.log("Average edge length:", averageEdgeLength);
}

function draw() {
    background(220, 30); // Clear the canvas

    // frameRate(6);

    // Relax the vertices slightly on each frame
    vertices
        .concat(subdivVertices)
        .forEach((vertex) => relaxVertexPosition(vertex, 0.5));
    // Redraw the mesh to visualize the current state
    drawMesh();
}

function createFaces() {
    //central ring
    const p0 = vertices[0];

    for (let j = 0; j < 6; j++) {
        const p1 = vertices[j + 1];
        const p2 = vertices[((j + 1) % 6) + 1];
        faces.push(new Face([p0, p1, p2]));
        const p3 = vertices[6 + 2 + 2 * j];
        faces.push(new Face([p1, p2, p3]));
    }
    //outer rings
    for (let i = 2; i < hexRingCount + 1; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < i; k++) {
                const p0 =
                    vertices[
                        getVertexIndex(
                            i - 1,
                            (j + floor(k / (i - 1))) % 6,
                            k % (i - 1)
                        )
                    ];
                // console.log(i - 1, (j + floor(k / (i - 1))) % 6, k % i);
                const p1 = vertices[getVertexIndex(i, j, k)];
                const p2 =
                    vertices[
                        getVertexIndex(
                            i,
                            (j + floor(k / (i - 1))) % 6,
                            (k + 1) % i
                        )
                    ];

                // console.log(i, j, k);
                // console.log(p0, p1, p2);
                faces.push(new Face([p0, p1, p2]));
                if (i < hexRingCount) {
                    const p3 =
                        vertices[
                            getVertexIndex(
                                i + 1,
                                j + (floor(k / i) % 6),
                                (k + 1) % (i + 1)
                            )
                        ];
                    faces.push(new Face([p1, p2, p3]));
                }
            }
        }
    }
}

function mergeTrianglesToQuadsRandomly() {
    let toRemove = new Set();
    let mergedFacesTemp = [];

    // Create a list of all possible pairs
    let pairs = [];
    for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
            pairs.push([i, j]);
        }
    }

    // Shuffle the pairs to randomize the order of processing
    shuffleArray(pairs);

    // Attempt to merge pairs in the randomized order
    for (let [i, j] of pairs) {
        if (toRemove.has(i) || toRemove.has(j)) continue;

        let sharedVertices = faces[i].vertices.filter((v) =>
            faces[j].vertices.includes(v)
        );
        if (sharedVertices.length === 2) {
            let nonSharedVertices = faces[i].vertices
                .concat(faces[j].vertices)
                .filter((v) => !sharedVertices.includes(v));
            let orderedVertices = [
                sharedVertices[0],
                nonSharedVertices[0],
                sharedVertices[1],
                nonSharedVertices[1],
            ];

            mergedFacesTemp.push(new Face(orderedVertices));
            toRemove.add(i).add(j);
            // Once a merge is made, you might choose to continue to try merging others or break, depending on desired randomness
        }
    }

    // Update the faces array
    faces = faces.filter((_, index) => !toRemove.has(index));
    faces = mergedFaces.concat(mergedFacesTemp, faces);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
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

function relaxVertices(iterations) {
    // Combine original and subdivided vertices for processing
    let allVertices = vertices.concat(subdivVertices);

    for (let it = 0; it < iterations; it++) {
        let vertexAdjustments = new Map();

        allVertices.forEach((vertex) => {
            if (vertex.edgy) return; // Skip vertices marked as 'edgy'

            let adjacentCentroids = [];
            faces.forEach((face) => {
                if (face.vertices.includes(vertex)) {
                    let centroid = getFaceCentroid(face);
                    adjacentCentroids.push(centroid);
                }
            });

            // If a vertex is not part of any face, don't adjust it
            if (adjacentCentroids.length === 0) return;

            // Calculate the average centroid for the current vertex
            let avgCentroid = {
                x:
                    adjacentCentroids.reduce((sum, c) => sum + c.x, 0) /
                    adjacentCentroids.length,
                y:
                    adjacentCentroids.reduce((sum, c) => sum + c.y, 0) /
                    adjacentCentroids.length,
            };

            vertexAdjustments.set(vertex, avgCentroid);
        });

        // Apply adjustments to vertices based on the calculated average centroids
        vertexAdjustments.forEach((centroid, vertex) => {
            vertex.x = centroid.x;
            vertex.y = centroid.y;
        });
    }
}

function getFaceCentroid(face) {
    let x = 0,
        y = 0;
    face.vertices.forEach((v) => {
        x += v.x;
        y += v.y;
    });
    return { x: x / face.vertices.length, y: y / face.vertices.length };
}

function drawMesh() {
    // Draw faces
    faces.forEach((face) => {
        beginShape();
        fill(200, 10); // Set face color
        face.vertices.forEach((v) => vertex(v.x, v.y));
        endShape(CLOSE);
    });

    // Draw vertices
    let allVertices = vertices.concat(subdivVertices);
    allVertices.forEach((v) => {
        stroke(0);
        fill(v.edgy ? "red" : "blue"); // Color-code based on the 'edgy' property
        ellipse(v.x, v.y, 5, 5);
    });
}

function relaxVerticesForArea(iterations) {
    for (let it = 0; it < iterations; it++) {
        // Assuming you have a function to calculate the area of a quad
        // and a way to associate each vertex with its adjacent quads

        vertices.forEach((vertex) => {
            if (vertex.edgy) return; // Skip edgy vertices

            let adjacentQuads = getAdjacentQuads(vertex);
            let averageArea = calculateAverageArea(adjacentQuads);
            let centroid = calculateCentroid(adjacentQuads); // Averaged centroid of adjacent quads

            // Direction based on area difference could be towards or away from centroid
            // This is a simplification and may not always be correct
            let direction = {
                x: centroid.x - vertex.x,
                y: centroid.y - vertex.y,
            };
            let magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
            direction.x /= magnitude; // Normalize
            direction.y /= magnitude;

            // Adjust vertex position based on a simplistic interpretation of the desired area change
            // The actual implementation would require more sophisticated geometric reasoning
            vertex.x +=
                direction.x * areaAdjustmentFactor(adjacentQuads, averageArea);
            vertex.y +=
                direction.y * areaAdjustmentFactor(adjacentQuads, averageArea);
        });
    }
}

function areaAdjustmentFactor(adjacentQuads, averageArea) {
    // This function calculates a factor for adjusting the vertex position based on the difference in area
    // Placeholder for actual implementation
    return 0.1; // Simplified example, replace with actual logic
}

function precalculateAdjacentFaces() {
    vertices.forEach((vertex) => {
        vertex.adjacentFaces = []; // Initialize the array to hold adjacent faces
    });

    subdivVertices.forEach((vertex) => {
        vertex.adjacentFaces = []; // Initialize for subdivided vertices too
    });

    faces.forEach((face) => {
        face.vertices.forEach((vertex) => {
            vertex.adjacentFaces.push(face); // Add this face to the vertex's list of adjacent faces
        });
    });
}

function relaxVertexPosition(vertex, strength = 0.1) {
    if (vertex.edgy || vertex.adjacentFaces.length === 0) return; // Skip if edgy or has no adjacent faces

    // Calculate the average centroid from precalculated adjacent faces
    let sumCentroid = vertex.adjacentFaces.reduce(
        (acc, face) => {
            let centroid = getFaceCentroid(face);
            acc.x += centroid.x;
            acc.y += centroid.y;
            return acc;
        },
        { x: 0, y: 0 }
    );

    let avgCentroid = {
        x: sumCentroid.x / vertex.adjacentFaces.length,
        y: sumCentroid.y / vertex.adjacentFaces.length,
    };

    // Apply adjustment with specified strength
    vertex.x += (avgCentroid.x - vertex.x) * strength;
    vertex.y += (avgCentroid.y - vertex.y) * strength;
}

function calculateAverageEdgeLength() {
    let totalLength = 0;
    let edgeCount = 0;

    faces.forEach((face) => {
        for (let i = 0; i < face.vertices.length; i++) {
            let startVertex = face.vertices[i];
            let endVertex = face.vertices[(i + 1) % face.vertices.length];
            let edgeLength = dist(
                startVertex.x,
                startVertex.y,
                endVertex.x,
                endVertex.y
            );

            totalLength += edgeLength;
            edgeCount++;
        }
    });

    return totalLength / edgeCount;
}

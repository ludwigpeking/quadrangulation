const hexGridDiameter = 40;
const hexRingCount = 10;
let vertices = [];
let edges = [];
let faces = [];
const recording = false;
let mergedFaces = [];
let subdivVertices = []; // To store new vertices
let edgeMidpointMap = new Map(); // Map to store and retrieve edge midpoints by edge key
let faceCenterVertices = []; // To store center vertices of faces
let averageEdgeLength = 0; // To store the average edge length of the mesh
let averageFaceArea = 0; // To store the average area of the faces

function setup() {
    randomSeed(0);
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
                //k lerps between 0, i-1
                const p = new Vertex(i, j, k);
                vertices.push(p);
                fill(255, 255, 0);
            }
        }
    }
    createFaces();
    mergeTrianglesToQuadsRandomly();
    subdivideMesh();
    showInitialGraph();
    vertices = vertices.concat(subdivVertices);
    precalculateAdjacentFaces(); // Add faces to the vertice's lists of adjacent faces for later centroid calculation
    averageFaceArea = calculateAverageArea(faces);
    // console.log("Average face area:", averageFaceArea);
    // averageEdgeLength = calculateAverageEdgeLength();
    // console.log("Average edge length:", averageEdgeLength);
    if (recording) {
        saveCanvas("frame_0", "png");
    }
}

function draw() {
    // noLoop();
    background(220, 30); // Clear the canvas
    faces.forEach((face) => {
        //calculate area
        const area = calculateFaceArea(face);
        face.draw();
    });

    // frameRate(6);
    // shuffleArray(faces); // Randomize the order of face processing on each frame
    shuffleArray(vertices); // Randomize the order of vertex processing on each frame
    // Relax the vertices slightly on each frame
    // relaxVerticesUsingWeightedCentroids(vertices, faces, 0.001);
    vertices
        // .concat(subdivVertices)
        .forEach((vertex) => relaxVertexPosition(vertex, 0.08));

    // relaxVerticesForArea(1, averageFaceArea, vertices, faces);
    // Redraw the mesh to visualize the current state
    // drawMesh();
    if (recording) {
        saveCanvas("frame_" + frameCount, "png");
    }
    if (frameCount > 500) {
        noLoop();
    }
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
        stroke(0);
        fill(200, 10); // Set face color
        face.vertices.forEach((v) => vertex(v.x, v.y));
        endShape(CLOSE);
        noStroke();
        fill(0, 50, 50);
        // text(
        //     round(face.area / averageFaceArea, 2),
        //     getFaceCentroid(face).x - 5,
        //     getFaceCentroid(face).y
        // );
    });

    // Draw vertices
    let allVertices = vertices.concat(subdivVertices);
    allVertices.forEach((v) => {
        stroke(0);
        fill(v.edgy ? "red" : "blue"); // Color-code based on the 'edgy' property
        ellipse(v.x, v.y, 5, 5);
    });
}

function relaxVerticesForArea(iterations, averageArea, vertices, faces) {
    for (let it = 0; it < iterations; it++) {
        faces.forEach((face) => {
            let faceArea = calculateFaceArea(face);
            const areaFactor =
                faceArea < averageArea * 0.8
                    ? -1
                    : faceArea > averageArea * 1.25
                    ? 1
                    : 0;
            if (areaFactor !== 0) {
                // Activate only if adjustment is needed
                let centroid = calculateFaceCentroid(face);
                face.vertices.forEach((vertex) => {
                    if (!vertex.edgy) {
                        // Calculate direction from vertex to centroid
                        let direction = {
                            x: centroid.x - vertex.x,
                            y: centroid.y - vertex.y,
                        };
                        let magnitude = Math.sqrt(
                            direction.x ** 2 + direction.y ** 2
                        );
                        direction.x /= magnitude; // Normalize
                        direction.y /= magnitude;

                        // Move vertex away from centroid to adjust area
                        vertex.x += direction.x * areaFactor; // The factor controls how much to adjust
                        vertex.y += direction.y * areaFactor;
                    }
                });
            }
        });
    }
}

function precalculateAdjacentFaces() {
    vertices.forEach((vertex) => {
        vertex.adjacentFaces = []; // Initialize the array to hold adjacent faces
    });

    faces.forEach((face) => {
        face.vertices.forEach((vertex) => {
            vertex.adjacentFaces.push(face); // Add this face to the vertex's list of adjacent faces
        });
    });
}

function relaxVertexPosition(vertex, strength = 0.1) {
    if (vertex.edgy || vertex.adjacentFaces.length === 0) return; // Skip if edgy or has no adjacent faces

    let weightedSumX = 0;
    let weightedSumY = 0;
    let totalWeight = 0;

    // Calculate the weighted centroid based on the area of adjacent faces
    vertex.adjacentFaces.forEach((face) => {
        let centroid = getFaceCentroid(face); // Assuming this returns the centroid of the face
        let weight = face.area; // Assuming each face has an 'area' property

        weightedSumX += centroid.x * weight;
        weightedSumY += centroid.y * weight;
        totalWeight += weight;
    });

    if (totalWeight > 0) {
        // Calculate the average position based on the weighted centroid
        let avgX = weightedSumX / totalWeight;
        let avgY = weightedSumY / totalWeight;

        // Apply the adjustment with specified strength
        vertex.x += (avgX - vertex.x) * strength;
        vertex.y += (avgY - vertex.y) * strength;
    }
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

function getAdjacentQuads(vertex) {
    let adjacentFaces = [];
    for (let face of faces) {
        if (face.vertices.includes(vertex)) {
            adjacentFaces.push(face);
        }
    }
    return adjacentFaces;
}

function calculateWeightedCentroid(vertex, faces) {
    let weightedSumX = 0;
    let weightedSumY = 0;
    let totalWeight = 0;

    const adjacentFaces = getAdjacentQuads(vertex);

    adjacentFaces.forEach((face) => {
        const area = calculateFaceArea(face);
        const centroid = calculateFaceCentroid(face);

        weightedSumX += centroid.x * area;
        weightedSumY += centroid.y * area;
        totalWeight += area;
    });

    if (totalWeight === 0) {
        // Avoid division by zero
        return { x: vertex.x, y: vertex.y };
    }

    return {
        x: weightedSumX / totalWeight,
        y: weightedSumY / totalWeight,
    };
}

function relaxVerticesUsingWeightedCentroids(vertices, faces, strength = 0.01) {
    // Note the reduced strength for finer control
    vertices.forEach((vertex) => {
        if (vertex.edgy) return; // Skip 'edgy' vertices

        const weightedCentroid = calculateWeightedCentroid(vertex, faces);
        let dx = weightedCentroid.x - vertex.x;
        let dy = weightedCentroid.y - vertex.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize the direction vector
        if (distance > 0) {
            dx /= distance;
            dy /= distance;
        }

        // Apply the adjustment with reduced strength, ensuring it's towards the weighted centroid
        vertex.x += dx * strength * distance;
        vertex.y += dy * strength * distance;
    });
}

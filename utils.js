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

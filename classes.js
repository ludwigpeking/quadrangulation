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
        this.centerHairLength = 2;
    }
    draw() {
        fill(200, 20);
        stroke(20);
        strokeWeight(0.3);
        beginShape();
        for (let v of this.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);
        //draw a cross at the center of the face, from the middle points from the opposite edges. the hair of the cross is 5 pixels
        let mid1 = {
            x: (this.vertices[0].x + this.vertices[3].x) / 2,
            y: (this.vertices[0].y + this.vertices[3].y) / 2,
        };
        let mid2 = {
            x: (this.vertices[3].x + this.vertices[2].x) / 2,
            y: (this.vertices[3].y + this.vertices[2].y) / 2,
        };
        let mid3 = {
            x: (this.vertices[2].x + this.vertices[1].x) / 2,
            y: (this.vertices[2].y + this.vertices[1].y) / 2,
        };
        let mid4 = {
            x: (this.vertices[1].x + this.vertices[0].x) / 2,
            y: (this.vertices[1].y + this.vertices[0].y) / 2,
        };

        const interSection = findIntersection(mid1, mid3, mid2, mid4);
        drawLineOfLengthAFromV1ToV2Direction(
            interSection,
            mid1,
            this.centerHairLength
        );
        drawLineOfLengthAFromV1ToV2Direction(
            interSection,
            mid2,
            this.centerHairLength
        );
        drawLineOfLengthAFromV1ToV2Direction(
            interSection,
            mid3,
            this.centerHairLength
        );
        drawLineOfLengthAFromV1ToV2Direction(
            interSection,
            mid4,
            this.centerHairLength
        );
    }
}

function findIntersection(v1, v2, v3, v4) {
    let x1 = v1.x;
    let y1 = v1.y;
    let x2 = v2.x;
    let y2 = v2.y;
    let x3 = v3.x;
    let y3 = v3.y;
    let x4 = v4.x;
    let y4 = v4.y;
    let x =
        ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    let y =
        ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    return { x: x, y: y };
}

function drawLineOfLengthAFromV1ToV2Direction(v1, v2, a) {
    let x1 = v1.x;
    let y1 = v1.y;
    let x2 = v2.x;
    let y2 = v2.y;
    let d = dist(x1, y1, x2, y2);
    let x = x1 + ((x2 - x1) * a) / d;
    let y = y1 + ((y2 - y1) * a) / d;
    line(x1, y1, x, y);
}

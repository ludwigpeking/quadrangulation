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

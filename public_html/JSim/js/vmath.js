var vmath = {};

vmath.newvector = function (x, y) {
    return {
        i: x,
        j: y
    };
};

vmath.dot = function (a, b) {
    return (a.i * b.i) + (a.j * b.j);
};

vmath.length = function (a) {
    return Math.sqrt(Math.pow(a.i, 2) + Math.pow(a.j, 2));
};

vmath.norm = function (a) {
    var d = vmath.length(a);
    return {
        i: a.i / d,
        j: a.j / d
    };
};

vmath.times = function (a, d) {
    return {
        i: d * a.i,
        j: d * a.j
    };
};

vmath.add = function (a, b) {
    return {
        i: a.i + b.i,
        j: a.j + b.j
    };
};

vmath.sub = function (a, b) {
    return {
        i: a.i - b.i,
        j: a.j - b.j
    };
};

vmath.print = function(a){
    return "("+(a.i).toFixed(2)+", " + (a.j).toFixed(2)+")";
};

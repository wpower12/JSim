; //Global Container
(function () {
    //Simulation Class
    var Simulation = function () {
        this.canvas = document.getElementById('gamecanvas');
        this.screen = this.canvas.getContext('2d');
        this.screenSize = {x: this.canvas.width, y: this.canvas.height};

        //Setting up the container for all the discs and point sources
        this.discs = [];
        this.points = [];

        //Statistics Fields
        this.frames = [];
        this.frame = 0;
        this.fsum = 0;
        this.fave = 0;
        this.delta = 1;
        this.last = new Date().getTime();
        this.fps = 60;
        this.slowChecks = 0;
        this.checkCounter = 0;
        this.energy = 0;
        for (var i = 0; i < 100; i++) {
            this.frames.push(0);
        }
        this.drawInfo = false;

        //Adding random discs/points
        var max = Math.floor(Math.random() * 10) + 4;
        for (var i = 0; i < max; i++) {
            this.discs.push(randomDisc(this.screenSize));
        }
        max = Math.floor(Math.random() * 3) + 1;
        for (var i = 0; i < max; i++) {
            this.points.push(randomPoint(this.screenSize));
        }

        //Create a quadtree for quick collision detection 
        var args = {
            x: 0,
            y: 0,
            w: this.canvas.width,
            h: this.canvas.height,
            maxChildren: 3
        };
        this.tree = QUAD.init(args);
        this.showGrid = false;

        //GifMaker for saving clips
        this.gif = new GifMaker(this.screen);
        this.recording = false;

        //Holds all the event handlers and their functions
        //  -makes it easier to animate control events
        this.input = new InputHandler(this);

        //tick() is the main 'game loop', requestAnimationFrame calls tick 
        var self = this;
        var tick = function () {
            self.update();
            self.draw();
            self.input.draw();          //For fancy control animations! woot
            self.gif.update();
            requestAnimationFrame(tick);
        };

        //First call to tick to start things off.
        tick();
    };
    Simulation.prototype = {
        update: function () {
            this.tree.clear();
            this.tree.insert(this.discs);
            this.checkCounter = 0;
            this.energy = 0;

            //For each disc
            for (var i = 0; i < this.discs.length; i++) {
                var b, nearby, collided = false;
                b = this.discs[i];
                //For all nearby discs
                nearby = this.tree.retrieve(b, function (item) {
                    if (notSame(b, item)) {
                        this.checkCounter++;
                        collided = resolveCollision(b, item);
                    }
                }, this);
                if (!collided) {
                    //If resolveCollision doesnt detect a hit, normal update
                    b.update(this.screenSize);
                }
                //Add energy to total.
                this.energy += b.energy();
            }

            this.tree.clear();
            this.tree.insert(this.discs);
            //For each Point, find nearby discs and act on them
            for (var i = 0; i < this.points.length; i++) {
                var p, nearby;
                p = this.points[i];
                //For all nearby discs
                nearby = this.tree.retrieve(p, function (item) {
                    //console.log(item);
                    if (p.inRange(item)) {
                        p.applyForce(item);
                    }
                }, this);

            }
            if (this.drawInfo) {
                this.updateStats();
            }
        },
        updateStats: function () {
            this.delta = (new Date().getTime() - this.last) / 1000;
            this.last = new Date().getTime();
            this.fps = 1 / this.delta;

            this.slowChecks = this.discs.length * (this.discs.length - 1);
            //100 Frame Average - FPS
            if (!isNaN(this.frames[this.frame])) {
                this.fsum -= this.frames[this.frame];
            }
            if (!isNaN(this.fps)) {
                this.fsum += this.fps;
                this.frames[this.frame] = this.fps;
            } else {

                this.frames[this.frame] = 0;
            }
            this.fave = (this.fsum / 100).toFixed(2);

            this.frame = (this.frame + 1) % 100;
        },
        draw: function () {
            this.screen.clearRect(0, 0, this.screenSize.x, this.screenSize.y);
            for (var i = 0; i < this.points.length; i++) {
                this.points[i].draw(this.screen);
            }
            for (var i = 0; i < this.discs.length; i++) {
                this.discs[i].draw(this.screen);
            }
            if (this.showGrid) {
                drawQuadtree(this.tree.root, this.screen);
            }
            if (this.drawInfo) {
                this.drawStats(this.screen);
            }
            this.input.draw();
        },
        drawStats: function (screen) {
            var d = 18;
            screen.fillStyle = "Black";
            screen.font = "normal 14pt courier";
            screen.fillText("         N: " + this.discs.length, 10, d * 1);
            screen.fillText("       FPS: " + (this.fps).toFixed(1), 10, d * 2);
            screen.fillText("  100F Ave: " + this.fave, 10, d * 3);
            screen.fillText("N^2 Checks: " + this.slowChecks, 10, d * 4);
            screen.fillText(" QT Checks: " + this.checkCounter, 10, d * 5);
            screen.fillText("|E| of System: " + this.energy, 10, d * 6);
        }
    };

    //Disc Class 
    var Disc = function (xi, yi, radius, xv, yv) {
        var center, radius, vel, x, y, w, h;
        this.center = vmath.newvector(xi, yi);
        this.radius = radius;
        this.vel = vmath.newvector(xv, yv);
        //To be used with the quad tree, need the following available fields
        this.x = this.center.i - radius; //Top Left
        this.y = this.center.j - radius;
        this.w = 2 * radius;
        this.h = 2 * radius;
    };
    Disc.prototype = {
        update: function (screenSize) {
            //Check if hitting walls
            //x
            if (this.center.i + this.vel.i <= this.radius || this.center.i + this.radius + this.vel.i >= screenSize.x) {
                this.vel.i = -1 * this.vel.i;
            } else {
                this.center.i += this.vel.i;
            }
            //y
            if (this.center.j + this.vel.j <= this.radius || this.center.j + this.radius + this.vel.j >= screenSize.y) {
                this.vel.j = -1 * this.vel.j;
            } else {
                this.center.j += this.vel.j;
            }
            //Update quad tree fields
            this.x = this.center.i - this.radius;
            this.y = this.center.j - this.radius;
        },
        setVel: function (a) {
            this.vel.i = a.i;
            this.vel.j = a.j;
        },
        setPos: function (a) {
            this.center.i = a.i;
            this.center.j = a.j;
            this.x = a.i - this.radius;
            this.y = a.j - this.radius;
        },
        energy: function () {
            return Math.pow(this.vel.i, 2) + Math.pow(this.vel.j, 2);
        },
        draw: function (screen) {
            screen.beginPath();
            screen.arc(this.center.i, this.center.j, this.radius, 0, 2 * Math.PI, false);
            screen.fillStyle = 'gray';
            screen.fill();
            screen.beginPath();
            screen.arc(this.center.i, this.center.j, this.radius, 0, 2 * Math.PI, false);
            screen.lineWidth = 2;
            screen.strokeStyle = 'black';
            screen.stroke();
        }
    };

    //'Gravity' Point Source 
    var PointSource = function (xi, yi, radius, power) {
        var center, radius, power, x, y, w, h;
        //Basic Fields
        this.center = vmath.newvector(xi, yi);
        this.radius = radius;
        this.G = 0.5;

        //for drawing
        this.power = power;
        this.powerscale = 3;
        this.n = this.power * this.powerscale;
        this.b = 2;
        this.a = 6 * (this.radius - this.n) / (this.n * (this.n + 1) * (2 * this.n + 1));

        //QT Fields
        this.x = this.center.x - radius; //Top Left
        this.y = this.center.y - radius;
        this.w = 2 * radius;
        this.h = 2 * radius;
    };
    PointSource.prototype = {
        inRange: function (disc) {
            return (Math.abs(vmath.length(vmath.sub(disc.center, this.center))) < this.radius + disc.radius);
        },
        applyForce: function (disc) {
            /* The point source applies a force on the line from the point to
             * the center of the disc.  this force changes the velocity by a 
             * set amount each frame.
             * 
             * The amount of velocity subtracted from each component is a function of
             * distance and the 'mass' of the point source
             * 
             * V' = V - c1*f(r)*C 
             * 
             * Gonna go with linear, not quadratic,  over d^2 is boring.
             */
            var dist = vmath.length(vmath.sub(disc.center, this.center));
            var factor = this.G * this.power * disc.radius / (dist);  //c1*f(r)
            var vprime = vmath.sub(disc.vel, vmath.times(vmath.sub(disc.center, this.center), factor)); //V - factor*C
            disc.setVel(vprime);
        },
        draw: function (screen) {
            var s = function (x, a, b) {
                return a * x * x + b;
            };
            var sums = function (x, a, b, i, j) {
                //Series a*i^2+b, a and b defined in pointsource.
                //sum_(x=n)^i x^2 = -1/6 (i-(1+j)) (2 i^2-(1-2 j) i-(2-j)) = S
                var S = (-1 / 6) * (i - 1 - j) * (2 * i * i - i + 2 * j * i - 2 + j);
                var ret = Math.abs((i - j) * b + a * S);
                return ret > 0 ? ret : 0;
            };
            var dist = function (p, i) {
                //Should return the loction of the ith circle of point p
                //higher power = more circles, closer together
                //lower power = less circles, spaced further apart
                return s(i, p.a, p.b) + sums(i, p.a, p.b, 0, i - 1);
            };

            for (var i = 1; i < this.n + 1; i++) {
                var c = Math.floor(255 - 255 * 0.75 * (1 - (dist(this, i) / this.radius)));
                if (c > 220)
                    c = 220;
                screen.strokeStyle = "rgb(" + c + "," + c + "," + c + ")";
                screen.beginPath();
                screen.arc(this.center.i, this.center.j, dist(this, i), 0, 2 * Math.PI, true);
                screen.stroke();
            }
        }
    };

    var GifMaker = function (c) {
        this.ctx = document.getElementById('gamecanvas');
        this.gif = {};
        this.recording = false;
        this.i = 0;
    };
    GifMaker.prototype = {
        startRecording: function () {
            this.recording = true;
            this.gif = new GIF({
                workers: 1,
                quality: 10,
                transparent: '#FFF'
            });
            console.log("> Started Recording Canvas Frames");
        },
        stopRecording: function () {
            this.recording = false;
            this.gif.on('finished', function (blob) {
                window.open(URL.createObjectURL(blob));
            });
            console.log('> Rendering Gif');
            this.gif.render();
            this.i = 0;
        },
        update: function () {
            if (this.recording) {
                this.gif.addFrame(this.ctx, {copy: true, delay: 0});
                console.log('> Added Frame ' + this.i);
                this.i++;
            }
        }
    };

    var InputHandler = function (s) {
        this.sim = s;
        this.c = s.canvas;
        this.rect = s.canvas.getBoundingClientRect();
        this.addingPoint = true;
        this.addingDisc = false;

        //General Buttons
        var clrButton = document.getElementById('clear');
        clrButton.addEventListener("click", this.clrAll.bind(this), false);
        var togButton = document.getElementById('grid');
        togButton.addEventListener("click", this.toggleGrid.bind(this), false);
        var statButton = document.getElementById('stats');
        statButton.addEventListener("click", this.toggleStats.bind(this), false);
        //var recButton = document.getElementById('record');
        //recButton.addEventListener("click", this.record.bind(this), false);

        //Buttons for click functions
        var pointButton = document.getElementById('point');
        var discButton = document.getElementById('disc');
        this.toggleBold(pointButton);
        this.addingPoint = true;
        //Add Point
        pointButton.addEventListener("click", function () {
            if (!this.addingPoint) {
                this.addingPoint = true;
                this.addingDisc = false;
                this.toggleBold(discButton);
                this.toggleBold(pointButton);
            }
        }.bind(this), false);
        //Add Disc
        discButton.addEventListener("click", function () {
            if (!this.addingDisc) {
                this.addingDisc = true;
                this.addingPoint = false;
                this.toggleBold(discButton);
                this.toggleBold(pointButton);
            }
        }.bind(this), false);

        //Fields used by both during click events
        this.addradius = 0;
        this.addpower = 0;
        this.addvelocity = vmath.newvector(0, 0);
        this.addtimer = 0;
        this.maxdiscradius = 20;
        this.maxvelocity = 4.5;
        this.velocityscale = 10;
        this.maxpointradius = 85;

        //Click control
        this.clickloc = 0;
        this.mouseloc = 0;
        this.clicking = false;
        this.sim.canvas.onmousedown = this.handleClick.bind(this);
    };
    InputHandler.prototype = {
        draw: function () {
            if (this.clicking) {
                if (this.addingPoint) {
                    this.draw_addPoint();
                } else if (this.addingDisc) {
                    this.draw_addDisc();
                }
            }
        },
        draw_addPoint: function () {
            //Draw circle of radius center to point
            var screen = this.sim.screen;

            screen.beginPath();
            screen.arc(this.clickloc.i, this.clickloc.j, this.addradius, 0, 2 * Math.PI, false);
            screen.lineWidth = 2;
            screen.strokeStyle = 'black';
            screen.stroke();
        },
        draw_addDisc: function () {
            //If havent moved draw circle

            //If have moved, draw circle, then line from circle to point


        },
        addDisc: function (event) {
            var c = this.sim.canvas;
            this.sim.discs.push(randomDisc(this.sim.screenSize));

            //On click, save click point

            //Attach an onmousemove callback
            //on move, toggle t
        },
        addPoint: function (event) {
            this.c.onmousemove = function (e) {
                e = e || event;
                var x = e.clientX - this.rect.left;
                var y = e.clientY - this.rect.top;
                this.mouseloc = {i: x, j: y};
                var dist = Math.abs(vmath.length(vmath.sub(this.clickloc, this.mouseloc)));
                dist = (dist < this.maxpointradius) ? dist : this.maxpointradius;
                this.addradius = dist;

            }.bind(this);

            this.c.onmouseup = function (e) {
                console.log("Release Callback");
                //xi, yi, radius, power
                if (this.addradius > 0) {
                    this.sim.points.push(new PointSource(this.clickloc.i, this.clickloc.j, this.addradius, this.addradius / 40));
                }
                //Reset stuff
                this.c.onmousemove = null;
                this.clicking = false;
            }.bind(this);
        },
        clrAll: function () {
            this.sim.discs = [];
            this.sim.points = [];
        },
        toggleBold: function (ele) {
            var style = ele.style;
            if (style.fontWeight == "") {
                style.fontWeight = "bold";
            } else {
                style.fontWeight = "";
            }
        },
        toggleGrid: function () {
            this.sim.showGrid = !this.sim.showGrid;
        },
        toggleStats: function () {
            this.sim.drawInfo = !this.sim.drawInfo;
        },
        record: function () {
            if (!this.sim.recording) {
                this.sim.gif.startRecording();
                this.sim.recording = true;
                //Change Style of Button to light red background
            } else {
                this.sim.gif.stopRecording();
                this.sim.recording = true;
                //Change style of Button back to white background
            }
        },
        handleClick: function (event) {
            var x = event.clientX - this.rect.left;
            var y = event.clientY - this.rect.top;
            this.clicking = true;
            this.clickloc = vmath.newvector(x, y);
            this.mouseloc = vmath.newvector(x, y);
            this.addradius = 0;
            if (this.addingPoint) {
                console.log('Adding Point Called');
                this.addPoint(event);
            } else if (this.addingDisc) {
                this.addDisc(event);
            }
        }
    };

    //Global functions
    var resolveCollision = function (b1, b2) {
        //Setting up salient vectors
        var C = vmath.sub(b1.center, b2.center);
        var movement = vmath.sub(b2.vel, b1.vel);
        var long = vmath.length(movement);
        var dist = vmath.length(C) - b1.radius - b2.radius;
        var lenM = vmath.length(movement);

        //First Test - Radii vs Movement vector
        if (lenM < dist) {
            return false;
        }

        var movenorm = vmath.norm(movement);
        var D = vmath.dot(C, movenorm);

        //Move-towards test
        if (D <= 0) {
            return false;
        }

        var lenC = vmath.length(C);
        var F = lenC * lenC - D * D;
        var fsumRad2 = (b1.radius + b2.radius) * (b1.radius + b2.radius);

        //Second Move Test   
        if (F >= fsumRad2) {
            return false;
        }

        var T = fsumRad2 - F;
        if (T < 0) {
            return false;
        }
        var distance = D - Math.sqrt(T);

        //Movement length test
        if (vmath.length(movement) < distance) {
            return false;
        }

        var short = vmath.length(vmath.norm(movement), distance);
        var ratio = (short / long);

        //New positions
        b1.setPos(vmath.add(b1.center, vmath.times(b1.vel, ratio)));
        b2.setPos(vmath.add(b2.center, vmath.times(b2.vel, ratio)));

        // We use the new disc locations to calculate the new velocity vectors
        var n = vmath.norm(vmath.sub(b2.center, b1.center));
        var a1 = vmath.dot(b1.vel, n);
        var a2 = vmath.dot(b2.vel, n);
        var adif = a1 - a2;
        var rad = b1.radius + b2.radius;
        var p = 2 * (adif / rad);

        //Set new velocities
        b1.setVel(vmath.sub(b1.vel, vmath.times(n, p * b2.radius)));
        b2.setVel(vmath.add(b2.vel, vmath.times(n, p * b1.radius)));
        return true;
    };
    var randomDisc = function (screensize) {
        var rad = Math.random() * 10 + 5;   // 5 < rad < 15
        var xloc = Math.random() * (screensize.x - 2 * rad) + rad; // rad < xloc < screensize-rad
        var yloc = Math.random() * (screensize.y - 2 * rad) + rad; // rad < xloc < screensize-rad      
        var xv = Math.random() * 6 - 3; //-3 < xv < 3
        var yv = Math.random() * 6 - 3; //-3 < yv < 3
        return new Disc(xloc, yloc, rad, xv, yv);
    };
    var randomPoint = function (screensize) {
        var rad = Math.random() * 50 + 55;
        var xloc = Math.random() * (screensize.x - 2 * rad) + rad; // rad < xloc < screensize-rad
        var yloc = Math.random() * (screensize.y - 2 * rad) + rad; // rad < xloc < screensize-rad      
        var pow = Math.random() * 1 + 1;
        return new PointSource(xloc, yloc, rad, pow);
    };
    var drawLine = function (screen, a, b) {
        screen.beginPath();
        screen.strokeStyle = 'black';
        screen.moveTo(a.i, a.j);
        screen.lineTo(b.i, b.j);
        screen.stroke();
    };
    var drawQuadtree = function (node, screen) {
        var nodes = node.getNodes(), i;
        if (nodes) {
            for (i = 0; i < nodes.length; i++) {
                drawQuadtree(nodes[i], screen);
            }
        }
        screen.beginPath();
        screen.rect(node.x, node.y, node.w, node.h);
        screen.strokeStyle = 'black';
        screen.stroke();
        screen.closePath();
    };
    var removeRandFromArray = function (array, index) {
        var randi = Math.floor(Math.random() * array.length);
        array.splice(randi, 1);
    };
    var notSame = function (b1, b2) {
        var dx, dy;
        dx = b1.center.i - b2.center.i;
        dy = b1.center.j - b2.center.j;
        return !((dx == 0) && (dy == 0));
    };

    //Callback that runs after DOM is loaded - the 'main'
    window.addEventListener('load', function () {
        console.log("> Starting a new Simulation");
        var sim = new Simulation();

    });
})();




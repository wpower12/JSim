<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title> watch </title>
        <link href="style/watch.css" rel="stylesheet">
        <script type="text/javascript" src="js/jquery-2.1.3.js"></script>      
        <script type="text/javascript" src="js/jsims.js"></script>
        <script type="text/javascript" src="js/quadtree2.js"></script>
        <script type="text/javascript" src="js/vmath.js"></script>
        <script type="text/javascript" src="js/gif.js"></script>
        <script type="text/javascript" src="gif.worker.js"></script>
        <script type="text/javascript" src="gif.js.map"></script>
        <script type="text/javascript" src="js/gif.worker.js.map"></script>
    </head>
    <body>
        <div class='canvascontainer noselect'>
            <h2>Discs!</h2>
            <div><canvas id='gamecanvas' width='700' height='500'></canvas><div>
            <ul>
                <li id='point'  >P</li>
                <li id='disc'  >D</li>
                <li id='clear'>C</li>
            </ul>
            <ul>
                <li id='grid'>G</li>
                <li id='stats'>S</li>
                <li id='record'>R</li>
            </ul>
        </div>
    </body>
</html>

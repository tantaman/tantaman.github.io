/*
Need to save the current state of the world -- list of vertical tile strips.

World only scrolls horizontally, not vertically.

We generate a vertical strip at a time.

StripList = [];

Each strip is 1 tile wide.

X position to StripList index ==> x / tileWidth.

So render from scrollLeft to scrollLeft + window.width.

If nothing is in the strip list... generate new strips.
There should be prior things to generate from, however.

--

Generation:
generate method.
Each tile has rules about what neighbors it can have.
Need a non-enmattered tile type. TileRuleset


*/

const tileSize = 16;

const tileTypes = {
    water: {},

    sky: {},

    underPlatformLeft: {},

    underPlatformRight: {},

    platformTop: {
        allowedAbove: [],
        allowedRight: [],
        image: ""
    },

    platformTopLeft: {},

    platformTopRight: {},

    underPlatformCenter: {}
};

function generator(viewport, stripList) {
    if (isEmpty(stripList)) {
        viewport = expandViewportForFreshWorld(viewport);
        return generate(viewport, stripList);
    }

    viewport = getUngeneratedViewport(viewport, stripList);
    return generate(viewport, stripList);
}

function getUngeneratedViewport(viewport, stripList) {
    const leftIndex = Math.floor(viewport.left() / tileSize);
    const rightIndex = Math.floor(viewport.right());
}

function generate(viewport, stripList) {
    return strpiList;
}

const fs = require("fs").promises;
const path = require("path");

const prefix = "./public/notes/";

[""]
    .reduce(
        (previousPromise, currentPath) =>
            updateIndex(prefix, previousPromise, currentPath),
        Promise.resolve({})
    )
    .then(result => console.log(result));

async function updateIndex(rel, previousPromise, currentPath) {
    const [index, stats] = await Promise.all([
        previousPromise,
        fs.stat(rel + currentPath)
    ]);
    if (stats.isDirectory()) {
        const files = await fs.readdir(rel + currentPath);
        return {
            ...index,
            [path.basename(currentPath)]: await files.reduce(
                (previousPromise, newPath) =>
                    updateIndex(
                        rel + currentPath + "/",
                        previousPromise,
                        newPath
                    ),
                Promise.resolve({})
            )
        };
    }

    return {
        ...index,
        [path.basename(currentPath)]: path.basename(currentPath)
    };
}

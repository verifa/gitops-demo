import axios from "axios";

export interface Config {
    colours: {
        alive: string;
        dead: string;
    };
    initialAlive: number[][];
    connected: boolean;
}

const randomState = () => {
    let array: number[][] = [];

    const pAlive = 0.25;

    const nRows = 8;
    const nCols = 8;

    for (let i = 0; i < nRows; ++i) {
        for (let j = 0; j < nCols; ++j) {
            if (Math.random() < pAlive) {
                array.push([i, j]);
            }
        }
    }

    return array;
};

export const loadConfig = async (): Promise<Config> => {
    // Defaults
    let config = {
        colours: {
            alive: "#262f42",
            dead: "#fefefe"
        },
        initialAlive: randomState(),
        connected: false
    };

    const response = await axios
        .get("/config")
        .then(response => {
            Object.assign(config, response.data);
            config["connected"] = true;
        })
        .catch(err => {
            console.log("Connection to config service failed");
            console.log(err);
        });

    return config;
};

import axios from "axios";

export interface Config {
    colours: {
        alive: string;
        dead: string;
    };
}

export const loadConfig = async () => {
    // Defaults
    let config = {
        colours: {
            alive: "#262f42",
            dead: "#fefefe"
        }
    };

    const response = await axios
        .get("/config")
        .then(response => {
            Object.assign(config, response.data);
        })
        .catch(err => {
            console.log("Connection to config service failed");
            console.log(err);
        });

    return config;
};

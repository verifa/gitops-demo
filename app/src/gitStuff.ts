import axios from "axios";

export const getPRList = (callback: (data: any) => void) => {
    const maxPRs = 5;

    axios
        .get("https://api.github.com/repos/verifa/gitops-demo/pulls")
        .then(res => callback(res.data.slice(0, maxPRs)));
};

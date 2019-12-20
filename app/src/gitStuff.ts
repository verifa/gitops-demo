import axios from "axios";

export interface PullRequest {
    id: string;
    title: string;
    state: string;
    created_at: Date;
}

export const getPRList = (callback: (data: PullRequest[]) => void) => {
    const maxPRs = 5;

    axios
        .get("https://api.github.com/repos/verifa/gitops-demo/pulls?state=all")
        .then(res => {
            const trimmed = res.data.slice(0, maxPRs);

            callback(
                trimmed.map((d: any) => {
                    return {
                        ...d,
                        created_at: new Date(d.created_at)
                    };
                })
            );
        });
};

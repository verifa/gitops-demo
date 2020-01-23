# Verifa GitOps demo

## Running the demo

### Context

The GitOps demo can be run either entirely locally or with the web app running on a remote Kubernetes cluster.

### The web app

The web app (`app` and `config_service`) can be run easily on a local Kubernetes cluster with `skaffold run` ([get Skaffold here](https://skaffold.dev/)).

### Launchpad service

The launchpad service (`launchpad`) can be run with `yarn install --dev` and `make local-test`.

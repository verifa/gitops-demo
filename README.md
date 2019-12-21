# garden

## local development

```
garden dev
```

This will automatically port-forward game of life to :8000 and make the garden UI accessible

## deploy to local k8s cluster (no port forwarding, no UI)

```
garden deploy --env local
```

## delete garden deployment

```
garden delete environment
```

## review logs

```
garden logs -f
```

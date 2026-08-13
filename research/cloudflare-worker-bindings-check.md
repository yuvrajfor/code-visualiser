# Cloudflare Worker Bindings Connector Check

**Checked:** 13 August 2026. The connected Cloudflare Worker Bindings service was verified with read-only inventory operations only; no cloud resources were created, edited, queried for records, or deleted.

| Binding area | Read-only operation tested | Returned account data | Status |
|---|---|---|---|
| Workers | `workers_list` | `count: 0`, `workers: []` | Connected; no Workers currently exist. |
| KV | `kv_namespaces_list` | `count: 0`, `namespaces: []` | Connected; no KV namespaces currently exist. |
| D1 | `d1_databases_list` | `result: []`, `total_count: 0` | Connected; no D1 databases currently exist. |
| R2 | `r2_buckets_list` | Cloudflare returned error `10042`: R2 must be enabled in the Cloudflare dashboard. | Connector is reachable; the R2 product is not enabled for this account. |

## Available connector capabilities

The connected service exposes 23 operations. It can inspect Workers and their code, manage KV namespaces, manage D1 databases and issue D1 queries, list/create/read/delete R2 buckets, manage Hyperdrive configurations, and search Cloudflare documentation. Read-only inspection operations are available for Workers, KV, D1, R2, Hyperdrive, and Cloudflare documentation. Resource creation, updates, D1 queries, and deletion are available but were deliberately not used in this check.

## Safe use with Code Story Studio

Code Story Studio currently runs on its managed full-stack deployment and keeps its application database there. Cloudflare is therefore **not yet part of the production request path**. A sensible optional next step is to create one KV namespace for non-sensitive, short-lived public graph-share cache entries, or one D1 database for a separate Cloudflare Worker-backed read model. Either choice requires an explicit confirmation before resources are created, and R2 requires first enabling the R2 product in the Cloudflare dashboard.

| Goal | Cloudflare feature | First action after confirmation |
|---|---|---|
| Cache public share links near users | KV | Create one dedicated namespace, then bind it to a Worker. |
| Run a lightweight edge endpoint | Workers | Create/deploy a Worker and attach the minimum required binding. |
| Maintain a separate edge data model | D1 | Create a database, define schema, then use parameterized queries. |
| Store generated exports | R2 | Enable R2 in Cloudflare, create a bucket, and define controlled object access. |

> The connector is working. The account is simply empty today, and R2 has not been enabled. No customer or production data was accessed during the check.

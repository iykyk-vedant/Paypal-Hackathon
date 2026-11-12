# GCP Fabric deployment status

The Fabric VM in GCP project `white-imprint-514408-d5` was deleted at the user's request. Its 100 GB boot disk, which contained the generated identities and ledger state, was deleted with it. The VM's IAP firewall rule was also removed.

There is no longer a Fabric host or endpoint in this GCP project. The Compute Engine API remains enabled; enabling the API itself does not create a running VM.

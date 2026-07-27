# DHA database ownership

`DHA_DB` binds the existing `thought` D1 database so the Rindle Worker can serve the legacy
`dha_report` rows. Its schema remains owned by `../../worker/migrations`; this empty directory
prevents Wrangler from accidentally treating the Rindle application migrations as migrations for
that D1 database.

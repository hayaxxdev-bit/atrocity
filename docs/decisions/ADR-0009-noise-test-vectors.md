# ADR-0009 — Golden Vectors Are a Release Gate

Noise implementation changes are not considered validated by unit tests
alone. A production-ready Noise engine must pass fixed test vectors and
peer interoperability tests.

The current development vector generator is intentionally not a release
gate because it generates runtime key material. Fixed authoritative
vectors will be introduced before target-specific profiles are enabled.

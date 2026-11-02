# Local braces patch (GHSA-vfj7-8cjw-p6xm)

Upstream `braces@3.0.3` is the latest on npm and has no fixed release for stack-exhaustion on deeply nested patterns.

This copy is 3.0.3 plus AST depth guards (`MAX_AST_DEPTH = 100`) from micromatch/braces#78. Wired via `package.json` overrides: `"braces": "file:vendor/braces"`.

Remove this vendor when npm publishes a patched braces release.
